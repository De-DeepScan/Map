import { io } from "socket.io-client";

const BACKOFFICE_URL = "http://192.168.10.1:3000";

// =====================
// Socket Connection
// =====================

const socket = io(BACKOFFICE_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  timeout: 20000,
  autoConnect: true,
});

// =====================
// Game State
// =====================

let registeredData = null;
let lastKnownState = {};

// =====================
// Audio State
// =====================

let audioConfig = {
  enabled: true,
  autoUnlock: true,
  debug: false,
};

let audioUnlocked = false;
let audioCtx = null;
let masterGain = null;
let masterVolume = 1;
let iaVolume = 1;

const ambientAudios = new Map();
const presetAudios = new Map();
let ttsAudio = null;
let progressInterval = null;

// =====================
// Audio Helpers
// =====================

function audioLog(msg, ...args) {
  if (audioConfig.debug) {
    console.log(`[gamemaster:audio] ${msg}`, ...args);
  }
}

function initAudioContext() {
  if (audioCtx) return;
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContextClass();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = masterVolume;
  masterGain.connect(audioCtx.destination);
  audioLog("AudioContext initialized");
}

function routeThroughMaster(audio) {
  if (!audioCtx || !masterGain) return;
  try {
    const source = audioCtx.createMediaElementSource(audio);
    source.connect(masterGain);
  } catch {
    // Already routed
  }
}

function doUnlockAudio() {
  if (audioUnlocked || !audioConfig.enabled) return;

  initAudioContext();

  if (audioCtx) {
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start();
  }

  audioUnlocked = true;
  audioLog("Audio unlocked via user interaction");

  socket.emit("register-audio-player", {});
  startProgressReporting();
  removeUnlockListeners();
}

const unlockEvents = ["click", "touchstart", "keydown"];

function addUnlockListeners() {
  if (typeof window === "undefined") return;
  for (const event of unlockEvents) {
    window.addEventListener(event, doUnlockAudio, { once: true, passive: true });
  }
  audioLog("User interaction listeners added");
}

function removeUnlockListeners() {
  if (typeof window === "undefined") return;
  for (const event of unlockEvents) {
    window.removeEventListener(event, doUnlockAudio);
  }
}

function startProgressReporting() {
  if (progressInterval !== null) return;

  progressInterval = window.setInterval(() => {
    for (const [idx, audio] of presetAudios) {
      if (!audio.paused && audio.duration) {
        socket.emit("audio:preset-progress", {
          presetIdx: idx,
          currentTime: audio.currentTime,
          duration: audio.duration,
        });
      }
    }
  }, 250);
}

function stopProgressReporting() {
  if (progressInterval !== null) {
    window.clearInterval(progressInterval);
    progressInterval = null;
  }
}

function stopAllAudio() {
  for (const [, audio] of ambientAudios) {
    audio.pause();
    audio.src = "";
  }
  ambientAudios.clear();

  for (const [, audio] of presetAudios) {
    audio.pause();
    audio.src = "";
  }
  presetAudios.clear();

  if (ttsAudio) {
    ttsAudio.pause();
    ttsAudio.src = "";
    ttsAudio = null;
  }

  audioLog("All audio stopped");
}

// =====================
// Audio Event Listeners
// =====================

function setupAudioEventListeners() {
  // Ambient sounds
  socket.on("audio:play-ambient", (data) => {
    if (!audioUnlocked || !audioConfig.enabled) return;
    const { soundId, file, volume } = data;
    audioLog("Play ambient:", soundId, file);

    const existing = ambientAudios.get(soundId);
    if (existing) {
      existing.pause();
      existing.src = "";
    }

    const audio = new Audio(`${BACKOFFICE_URL}/sounds/${file}`);
    audio.loop = true;
    audio.volume = volume ?? 0.5;
    routeThroughMaster(audio);
    audio.play().catch((e) => audioLog("Play ambient error:", e.message));
    ambientAudios.set(soundId, audio);
  });

  socket.on("audio:stop-ambient", (data) => {
    const { soundId } = data;
    audioLog("Stop ambient:", soundId);
    const audio = ambientAudios.get(soundId);
    if (audio) {
      audio.pause();
      audio.src = "";
      ambientAudios.delete(soundId);
    }
  });

  socket.on("audio:volume-ambient", (data) => {
    const { soundId, volume } = data;
    const audio = ambientAudios.get(soundId);
    if (audio) {
      audio.volume = volume;
      audioLog("Ambient volume:", soundId, volume);
    }
  });

  // Presets
  socket.on("audio:play-preset", (data) => {
    if (!audioUnlocked || !audioConfig.enabled) return;
    const { presetIdx, file } = data;

    const existing = presetAudios.get(presetIdx);
    if (existing && existing.src) {
      audioLog("Resume preset:", presetIdx);
      existing.volume = iaVolume;
      existing.play().catch((e) => audioLog("Resume preset error:", e.message));
      return;
    }

    audioLog("Play preset:", presetIdx, file);
    const audio = new Audio(`${BACKOFFICE_URL}/presets/${file}`);
    audio.volume = iaVolume;
    routeThroughMaster(audio);

    audio.onended = () => {
      socket.emit("audio:preset-progress", {
        presetIdx,
        currentTime: audio.duration,
        duration: audio.duration,
        ended: true,
      });
      presetAudios.delete(presetIdx);
    };

    audio.play().catch((e) => audioLog("Play preset error:", e.message));
    presetAudios.set(presetIdx, audio);
  });

  socket.on("audio:pause-preset", (data) => {
    const { presetIdx } = data;
    audioLog("Pause preset:", presetIdx);
    const audio = presetAudios.get(presetIdx);
    if (audio) audio.pause();
  });

  socket.on("audio:seek-preset", (data) => {
    const { presetIdx, time } = data;
    audioLog("Seek preset:", presetIdx, "to", time);
    const audio = presetAudios.get(presetIdx);
    if (audio) audio.currentTime = time;
  });

  socket.on("audio:stop-preset", (data) => {
    const { presetIdx } = data;
    audioLog("Stop preset:", presetIdx);
    const audio = presetAudios.get(presetIdx);
    if (audio) {
      audio.pause();
      audio.src = "";
      presetAudios.delete(presetIdx);
    }
  });

  // TTS
  socket.on("audio:play-tts", (data) => {
    if (!audioUnlocked || !audioConfig.enabled) return;
    const { audioBase64, mimeType } = data;
    audioLog("Play TTS");

    if (ttsAudio) {
      ttsAudio.pause();
      ttsAudio.src = "";
    }

    const binary = atob(audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType || "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    ttsAudio = new Audio(url);
    ttsAudio.volume = iaVolume;
    routeThroughMaster(ttsAudio);
    ttsAudio.onended = () => {
      URL.revokeObjectURL(url);
      ttsAudio = null;
    };
    ttsAudio.play().catch((e) => audioLog("TTS play error:", e.message));
  });

  // Volume controls
  socket.on("audio:volume-ia", (data) => {
    iaVolume = data.volume;
    audioLog("IA volume:", Math.round(iaVolume * 100) + "%");
    for (const audio of presetAudios.values()) {
      audio.volume = iaVolume;
    }
    if (ttsAudio) ttsAudio.volume = iaVolume;
  });

  socket.on("audio:master-volume", (data) => {
    masterVolume = data.volume;
    audioLog("Master volume:", Math.round(masterVolume * 100) + "%");
    if (masterGain) masterGain.gain.value = masterVolume;
  });

  // Stop all
  socket.on("audio:stop-all", () => {
    audioLog("Stop all audio");
    stopAllAudio();
  });
}

// =====================
// Webcam (WebRTC)
// =====================

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const CAMERA_ID = "infection-map";
const PING_INTERVAL = 30_000;

let webcamStream = null;
let peerConnection = null;
let pingTimer = null;

async function initWebcam() {
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    console.log(`[webrtc:${CAMERA_ID}] Webcam stream acquired`);
  } catch (err) {
    console.error(`[webrtc:${CAMERA_ID}] Failed to access webcam:`, err);
  }
}

function sendCameraPing() {
  if (socket.connected) {
    socket.emit("webrtc:camera-ping", { cameraId: CAMERA_ID });
  }
}

function startCameraPing() {
  sendCameraPing();
  socket.on("connect", () => sendCameraPing());
  pingTimer = setInterval(() => sendCameraPing(), PING_INTERVAL);
}

function cleanupPeerConnection() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
}

async function handleRequestOffer() {
  if (!webcamStream) {
    console.warn(
      `[webrtc:${CAMERA_ID}] No webcam stream available, ignoring request-offer`
    );
    return;
  }

  cleanupPeerConnection();

  const pc = new RTCPeerConnection(rtcConfig);
  peerConnection = pc;

  webcamStream.getTracks().forEach((track) => {
    pc.addTrack(track, webcamStream);
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("webrtc:ice-candidate", {
        cameraId: CAMERA_ID,
        candidate: event.candidate.toJSON(),
      });
    }
  };

  pc.onconnectionstatechange = () => {
    console.log(
      `[webrtc:${CAMERA_ID}] Connection state: ${pc.connectionState}`
    );
    if (
      pc.connectionState === "failed" ||
      pc.connectionState === "disconnected" ||
      pc.connectionState === "closed"
    ) {
      cleanupPeerConnection();
    }
  };

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("webrtc:offer", {
      cameraId: CAMERA_ID,
      sdp: pc.localDescription,
    });
    console.log(`[webrtc:${CAMERA_ID}] Offer sent`);
  } catch (err) {
    console.error(`[webrtc:${CAMERA_ID}] Failed to create offer:`, err);
    cleanupPeerConnection();
  }
}

function handleWebrtcAnswer(data) {
  if (!peerConnection) {
    console.warn(`[webrtc:${CAMERA_ID}] No peer connection for answer`);
    return;
  }
  peerConnection
    .setRemoteDescription(new RTCSessionDescription(data.sdp))
    .then(() => console.log(`[webrtc:${CAMERA_ID}] Answer set`))
    .catch((err) =>
      console.error(`[webrtc:${CAMERA_ID}] Failed to set answer:`, err)
    );
}

function handleWebrtcIceCandidate(data) {
  if (!peerConnection) return;
  peerConnection
    .addIceCandidate(new RTCIceCandidate(data.candidate))
    .catch((err) =>
      console.error(
        `[webrtc:${CAMERA_ID}] Failed to add ICE candidate:`,
        err
      )
    );
}

function setupWebcamListeners() {
  socket.on("webrtc:request-offer", (data) => {
    if (data.cameraId === CAMERA_ID) {
      handleRequestOffer();
    }
  });

  socket.on("webrtc:answer", (data) => {
    if (data.cameraId === CAMERA_ID) {
      handleWebrtcAnswer(data);
    }
  });

  socket.on("webrtc:ice-candidate", (data) => {
    if (data.cameraId === CAMERA_ID) {
      handleWebrtcIceCandidate(data);
    }
  });
}

// Initialize webcam
initWebcam();
setupWebcamListeners();
startCameraPing();

// =====================
// Game Connection Handlers
// =====================

socket.on("connect", () => {
  console.log("[gamemaster] Connected to backoffice");
  if (registeredData) {
    socket.emit("register", registeredData);
    if (Object.keys(lastKnownState).length > 0) {
      setTimeout(() => {
        socket.emit("state_update", { state: lastKnownState });
      }, 100);
    }
  }
  if (audioUnlocked && audioConfig.enabled) {
    socket.emit("register-audio-player", {});
  }
});

socket.on("disconnect", (reason) => {
  console.log(`[gamemaster] Disconnected: ${reason}`);
});

socket.io.on("reconnect_attempt", (attempt) => {
  console.log(`[gamemaster] Reconnection attempt ${attempt}`);
});

socket.io.on("reconnect", (attempt) => {
  console.log(`[gamemaster] Reconnected after ${attempt} attempts`);
});

socket.io.on("reconnect_failed", () => {
  console.error("[gamemaster] Reconnection failed");
});

// =====================
// Audio Visibility Handler
// =====================

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (
      document.visibilityState === "visible" &&
      audioCtx?.state === "suspended"
    ) {
      audioCtx.resume();
    }
  });
}

// =====================
// Audio Auto-Init
// =====================

(function initAudio() {
  if (typeof window === "undefined") return;

  setupAudioEventListeners();

  if (audioConfig.autoUnlock) {
    addUnlockListeners();
  }
})();

// =====================
// Gamemaster Export
// =====================

export const gamemaster = {
  // Game API
  register(gameId, name, availableActions = [], role) {
    registeredData = { gameId, name, availableActions, role };
    socket.emit("register", registeredData);
  },

  onCommand(callback) {
    socket.on("command", (data) => {
      callback({ action: data.action, payload: data.payload });
    });
  },

  updateState(state) {
    lastKnownState = { ...lastKnownState, ...state };
    socket.emit("state_update", { state: lastKnownState });
  },

  resetState() {
    lastKnownState = {};
  },

  sendEvent(name, data = {}) {
    socket.emit("event", { name, data });
  },

  sendMessage(message) {
    socket.emit("game-message", message);
  },

  onMessage(callback) {
    socket.on("game-message", callback);
  },

  onConnect(callback) {
    socket.on("connect", callback);
  },

  onDisconnect(callback) {
    socket.on("disconnect", callback);
  },

  get isConnected() {
    return socket.connected;
  },

  // Audio API
  get isAudioReady() {
    return audioUnlocked && audioConfig.enabled;
  },

  get audioStatus() {
    return {
      unlocked: audioUnlocked,
      enabled: audioConfig.enabled,
      masterVolume,
      iaVolume,
      activeAmbients: [...ambientAudios.keys()],
      activePresets: [...presetAudios.keys()],
    };
  },

  configureAudio(config) {
    audioConfig = { ...audioConfig, ...config };
    console.log("[gamemaster] Audio configured:", audioConfig);

    if (config.enabled && config.autoUnlock !== false && typeof window !== "undefined") {
      addUnlockListeners();
    }

    if (config.enabled === false) {
      stopAllAudio();
      stopProgressReporting();
    }
  },

  unlockAudio() {
    if (audioUnlocked) return true;
    if (!audioConfig.enabled) return false;
    doUnlockAudio();
    return audioUnlocked;
  },

  disableAudio() {
    audioConfig.enabled = false;
    stopAllAudio();
    stopProgressReporting();
  },

  enableAudio() {
    audioConfig.enabled = true;
    if (audioUnlocked) {
      socket.emit("register-audio-player", {});
      startProgressReporting();
    }
  },

  socket,
};

// =====================
// Global Window Export
// =====================

window.gamemaster = gamemaster;
