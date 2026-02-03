import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from 'wZ';

// Zone d'activation (centre de l'ecran, partie basse)
const ACTIVATION_ZONE = {
  xMin: 0.2,  // 20% depuis la gauche
  xMax: 0.8,  // 80% depuis la gauche
  yMin: 0.3,  // 30% depuis le haut
  yMax: 0.9,  // 90% depuis le haut
};
const STABILIZATION_TIME = 400; // ms pour activer le controle
const STABILIZATION_THRESHOLD = 0.03; // mouvement max pendant stabilisation

/**
 * Hook useHandTracking
 *
 * Detecte les gestes de la main pour controler la rotation:
 * - Main ouverte dans la zone d'activation = rotation
 * - Poing ferme = STOP la rotation
 * - Stabilisation 0.4s pour activer le controle
 */
export function useHandTracking({ enabled = true, sensitivity = 2.0 } = {}) {
  const [isReady, setIsReady] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [handPosition, setHandPosition] = useState(null);
  const [landmarks, setLandmarks] = useState(null); // Tous les points de la main
  const [stabilizationProgress, setStabilizationProgress] = useState(0); // 0-1
  const [isFist, setIsFist] = useState(false);
  const [isControlActive, setIsControlActive] = useState(false); // Controle actif apres stabilisation
  const [swipeDirection, setSwipeDirection] = useState(0);
  const [rotationDelta, setRotationDelta] = useState(0);

  const handLandmarkerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastPositionRef = useRef(null);
  const lastTimeRef = useRef(0);
  const frameSkipRef = useRef(0);
  const smoothedDeltaRef = useRef(0);

  // Detection d'intention
  const stabilizationStartRef = useRef(null);
  const lastStablePositionRef = useRef(null);
  const controlActiveRef = useRef(false);

  // Refs pour throttler les mises à jour UI (optimisation)
  const uiUpdateCounterRef = useRef(0);
  const lastStabProgressRef = useRef(0);

  // Ref pour lisser la detection du poing (evite les oscillations)
  const fistScoreHistoryRef = useRef([]);
  const FIST_HISTORY_SIZE = 5; // Nombre de frames pour lisser
  const FIST_THRESHOLD = 0.6; // Seuil pour considerer comme poing (60%)

  // Detecter si la main est un poing ferme avec score de confiance
  // Utilise plusieurs metriques pour une detection plus robuste
  const detectFist = useCallback((landmarks) => {
    if (!landmarks || landmarks.length < 21) return false;

    // Points cles de la main (21 landmarks MediaPipe)
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexMCP = landmarks[5];
    const indexPIP = landmarks[6];
    const indexTip = landmarks[8];
    const middleMCP = landmarks[9];
    const middlePIP = landmarks[10];
    const middleTip = landmarks[12];
    const ringMCP = landmarks[13];
    const ringPIP = landmarks[14];
    const ringTip = landmarks[16];
    const pinkyMCP = landmarks[17];
    const pinkyPIP = landmarks[18];
    const pinkyTip = landmarks[20];

    // Calculer la taille de reference (distance poignet -> base majeur)
    const handSize = Math.sqrt(
      Math.pow(middleMCP.x - wrist.x, 2) +
      Math.pow(middleMCP.y - wrist.y, 2)
    );

    if (handSize < 0.05) return false; // Main trop petite/loin

    // === METRIQUE 1: Distance bout de doigt -> paume (normalisee) ===
    // Pour un poing, les bouts sont proches de la paume
    const palmCenter = {
      x: (wrist.x + middleMCP.x) / 2,
      y: (wrist.y + middleMCP.y) / 2
    };

    const distanceToPlam = (tip) => Math.sqrt(
      Math.pow(tip.x - palmCenter.x, 2) + Math.pow(tip.y - palmCenter.y, 2)
    ) / handSize;

    const indexDist = distanceToPlam(indexTip);
    const middleDist = distanceToPlam(middleTip);
    const ringDist = distanceToPlam(ringTip);
    const pinkyDist = distanceToPlam(pinkyTip);

    // Score: plus les doigts sont proches de la paume, plus le score est eleve
    const distScore = Math.max(0, 1 - (indexDist + middleDist + ringDist + pinkyDist) / 4);

    // === METRIQUE 2: Angle de courbure des doigts ===
    // Verifier si les doigts sont plies (PIP plus haut que tip en Y)
    const fingerCurled = (mcp, pip, tip) => {
      // Le doigt est plie si le bout est plus bas (Y plus grand) que le PIP
      // et si le PIP est entre MCP et tip
      const curled = tip.y > pip.y - handSize * 0.05;
      return curled ? 1 : 0;
    };

    const indexCurled = fingerCurled(indexMCP, indexPIP, indexTip);
    const middleCurled = fingerCurled(middleMCP, middlePIP, middleTip);
    const ringCurled = fingerCurled(ringMCP, ringPIP, ringTip);
    const pinkyCurled = fingerCurled(pinkyMCP, pinkyPIP, pinkyTip);

    const curlScore = (indexCurled + middleCurled + ringCurled + pinkyCurled) / 4;

    // === METRIQUE 3: Compacite de la main ===
    // Un poing est plus compact (tous les points proches les uns des autres)
    const allTips = [thumbTip, indexTip, middleTip, ringTip, pinkyTip];
    let maxDist = 0;
    for (let i = 0; i < allTips.length; i++) {
      for (let j = i + 1; j < allTips.length; j++) {
        const d = Math.sqrt(
          Math.pow(allTips[i].x - allTips[j].x, 2) +
          Math.pow(allTips[i].y - allTips[j].y, 2)
        );
        if (d > maxDist) maxDist = d;
      }
    }
    const compactScore = Math.max(0, 1 - maxDist / (handSize * 2));

    // === METRIQUE 4: Position du pouce ===
    // Pour un poing, le pouce est replie vers l'index
    const thumbToIndex = Math.sqrt(
      Math.pow(thumbTip.x - indexMCP.x, 2) +
      Math.pow(thumbTip.y - indexMCP.y, 2)
    ) / handSize;
    const thumbScore = Math.max(0, 1 - thumbToIndex);

    // === SCORE FINAL PONDERE ===
    const finalScore = (
      distScore * 0.3 +      // 30% distance a la paume
      curlScore * 0.35 +     // 35% doigts plies
      compactScore * 0.2 +   // 20% compacite
      thumbScore * 0.15      // 15% position du pouce
    );

    // Ajouter au historique pour lissage
    fistScoreHistoryRef.current.push(finalScore);
    if (fistScoreHistoryRef.current.length > FIST_HISTORY_SIZE) {
      fistScoreHistoryRef.current.shift();
    }

    // Moyenne lissee
    const smoothedScore = fistScoreHistoryRef.current.reduce((a, b) => a + b, 0)
      / fistScoreHistoryRef.current.length;

    return smoothedScore > FIST_THRESHOLD;
  }, []);

  // Initialiser MediaPipe Hand Landmarker
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const initHandTracking = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        if (isMounted) {
          handLandmarkerRef.current = handLandmarker;
          setIsReady(true);
        }
      } catch (error) {
        console.error('Erreur initialisation hand tracking:', error);
      }
    };

    initHandTracking();

    return () => {
      isMounted = false;
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, [enabled]);

  // Demarrer la camera
  const startCamera = useCallback(async () => {
    if (!videoRef.current) return false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsTracking(true);
      return true;
    } catch (error) {
      console.error('Erreur acces camera:', error);
      return false;
    }
  }, []);

  // Arreter la camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsTracking(false);
    setSwipeDirection(0);
    setRotationDelta(0);
    lastPositionRef.current = null;
  }, []);

  // Detecter les mains et calculer le mouvement
  const detectHands = useCallback(() => {
    if (!handLandmarkerRef.current || !videoRef.current || !isTracking) {
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
      return;
    }

    // Skip frames pour optimisation (traiter 1 frame sur 3)
    frameSkipRef.current++;
    if (frameSkipRef.current % 3 !== 0) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
      return;
    }

    // Compteur pour throttler les mises à jour UI
    uiUpdateCounterRef.current++;

    const now = performance.now();
    // eslint-disable-next-line no-unused-vars
    const deltaTime = lastTimeRef.current > 0 ? now - lastTimeRef.current : 16;
    lastTimeRef.current = now;

    try {
      const results = handLandmarkerRef.current.detectForVideo(video, Math.floor(now));

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];

        // Utiliser le point central de la paume (landmark 9 = milieu de la paume)
        const palmCenter = landmarks[9];
        const currentX = palmCenter.x;

        // Detecter si c'est un poing ferme
        const fistDetected = detectFist(landmarks);
        setIsFist(fistDetected);

        // Verifier si la main est dans la zone d'activation
        const inZone = (
          palmCenter.x >= ACTIVATION_ZONE.xMin &&
          palmCenter.x <= ACTIVATION_ZONE.xMax &&
          palmCenter.y >= ACTIVATION_ZONE.yMin &&
          palmCenter.y <= ACTIVATION_ZONE.yMax
        );

        // Gestion de la stabilisation pour activer le controle
        // Le controle fonctionne avec main ouverte OU poing ferme
        if (inZone) {
          if (!controlActiveRef.current) {
            // Pas encore actif - verifier la stabilisation
            if (lastStablePositionRef.current === null) {
              // Debut de la stabilisation
              lastStablePositionRef.current = currentX;
              stabilizationStartRef.current = now;
            } else {
              // Verifier si la main est stable
              const movement = Math.abs(currentX - lastStablePositionRef.current);
              if (movement > STABILIZATION_THRESHOLD) {
                // Trop de mouvement - reset
                lastStablePositionRef.current = currentX;
                stabilizationStartRef.current = now;
              } else {
                // Mettre a jour la progression de stabilisation (throttled)
                const stabProgress = Math.min(1, (now - stabilizationStartRef.current) / STABILIZATION_TIME);
                // Ne mettre à jour le state que si changement > 10%
                if (Math.abs(stabProgress - lastStabProgressRef.current) > 0.1 || stabProgress >= 1) {
                  lastStabProgressRef.current = stabProgress;
                  setStabilizationProgress(stabProgress);
                }

                if (stabProgress >= 1) {
                  // Stable assez longtemps - activer le controle!
                  controlActiveRef.current = true;
                  setIsControlActive(true);
                  lastPositionRef.current = currentX;
                  setStabilizationProgress(0);
                }
              }
            }
          }
        } else {
          // Hors zone - desactiver
          if (controlActiveRef.current) {
            controlActiveRef.current = false;
            setIsControlActive(false);
          }
          lastStablePositionRef.current = null;
          stabilizationStartRef.current = null;
          if (lastStabProgressRef.current !== 0) {
            lastStabProgressRef.current = 0;
            setStabilizationProgress(0);
          }
        }

        // Throttler les mises à jour UI de landmarks et handPosition (1 sur 2)
        if (uiUpdateCounterRef.current % 2 === 0) {
          setLandmarks(landmarks);
          setHandPosition({
            x: palmCenter.x,
            y: palmCenter.y,
            isFist: fistDetected,
            inZone,
            isControlActive: controlActiveRef.current,
          });
        }

        // Controle de rotation seulement si actif
        if (controlActiveRef.current && lastPositionRef.current !== null) {
          // POING = STOP la rotation
          if (fistDetected) {
            // Freinage rapide quand poing ferme
            smoothedDeltaRef.current *= 0.7; // Freinage fort
            setRotationDelta(smoothedDeltaRef.current);
            if (Math.abs(smoothedDeltaRef.current) < 0.001) {
              setSwipeDirection(0);
            }
            // Ne pas mettre a jour lastPositionRef pour reprendre au meme endroit
          } else {
            // Main ouverte = rotation normale
            const deltaX = currentX - lastPositionRef.current;
            const threshold = 0.015;

            if (Math.abs(deltaX) > threshold) {
              const direction = deltaX > 0 ? -1 : 1;
              setSwipeDirection(direction);

              // Calculer la velocite (distance / temps)
              const velocity = Math.abs(deltaX) / Math.max(deltaTime, 8) * 1000;

              // La rotation depend de la velocite de la main
              const velocityFactor = Math.min(velocity / 0.8, 3); // Cap a 3x (reduit pour rotation plus lente)
              const rotationAmount = Math.abs(deltaX) * sensitivity * velocityFactor * 1.0;

              smoothedDeltaRef.current = smoothedDeltaRef.current * 0.2 + (direction * rotationAmount) * 0.8;
              setRotationDelta(smoothedDeltaRef.current);
            } else {
              smoothedDeltaRef.current *= 0.95;
              setRotationDelta(smoothedDeltaRef.current);
              if (Math.abs(smoothedDeltaRef.current) < 0.001) {
                setSwipeDirection(0);
              }
            }

            lastPositionRef.current = currentX;
          }
        } else if (!controlActiveRef.current) {
          // Controle inactif - inertie
          smoothedDeltaRef.current *= 0.97;
          setRotationDelta(smoothedDeltaRef.current);
          if (Math.abs(smoothedDeltaRef.current) < 0.001) {
            setSwipeDirection(0);
          }
        }

      } else {
        // Pas de main detectee - reset et garder l'inertie (throttled)
        if (uiUpdateCounterRef.current % 2 === 0) {
          setHandPosition(null);
          setLandmarks(null);
          setIsFist(false);
        }
        if (lastStabProgressRef.current !== 0) {
          lastStabProgressRef.current = 0;
          setStabilizationProgress(0);
        }
        lastPositionRef.current = null;
        lastStablePositionRef.current = null;
        stabilizationStartRef.current = null;
        if (controlActiveRef.current) {
          controlActiveRef.current = false;
          setIsControlActive(false);
        }
        // Garder l'inertie
        smoothedDeltaRef.current *= 0.97;
        setRotationDelta(smoothedDeltaRef.current);
        if (Math.abs(smoothedDeltaRef.current) < 0.001) {
          setSwipeDirection(0);
        }
      }
    } catch (error) {
      // Ignorer les erreurs de detection
    }

    animationFrameRef.current = requestAnimationFrame(detectHands);
  }, [isTracking, sensitivity, detectFist]);

  // Demarrer la detection quand la camera est active
  useEffect(() => {
    if (isTracking && isReady) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isTracking, isReady, detectHands]);

  return {
    isReady,
    isTracking,
    handPosition,
    landmarks,
    isFist,
    isControlActive,
    stabilizationProgress,
    swipeDirection,
    rotationDelta,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
  };
}

export default useHandTracking;
