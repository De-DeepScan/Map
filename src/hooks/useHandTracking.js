import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

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
 * - Main ouverte dans la zone d'activation
 * - Stabilisation 0.5s pour activer le controle
 * - Swipe gauche/droite pour tourner
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

  // Detecter si la main est un poing ferme
  // On verifie que les bouts des doigts sont proches de la paume
  const detectFist = useCallback((landmarks) => {
    if (!landmarks || landmarks.length < 21) return false;

    // Points cles:
    // 0 = poignet, 9 = base du majeur (centre paume)
    // 4 = bout du pouce, 8 = bout de l'index, 12 = bout du majeur
    // 16 = bout de l'annulaire, 20 = bout de l'auriculaire

    const wrist = landmarks[0];
    const palmBase = landmarks[9];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // MCP joints (base des doigts)
    const indexMCP = landmarks[5];
    const middleMCP = landmarks[9];
    const ringMCP = landmarks[13];
    const pinkyMCP = landmarks[17];

    // Calculer la taille de reference (distance poignet -> base majeur)
    const handSize = Math.sqrt(
      Math.pow(palmBase.x - wrist.x, 2) +
      Math.pow(palmBase.y - wrist.y, 2)
    );

    // Pour un poing, les bouts des doigts doivent etre plus bas (y plus grand)
    // que les MCP joints, ou tres proches
    const fingersCurled = (
      indexTip.y > indexMCP.y - handSize * 0.1 &&
      middleTip.y > middleMCP.y - handSize * 0.1 &&
      ringTip.y > ringMCP.y - handSize * 0.1 &&
      pinkyTip.y > pinkyMCP.y - handSize * 0.1
    );

    // Le pouce doit aussi etre replie (proche de l'index)
    const thumbDistance = Math.sqrt(
      Math.pow(thumbTip.x - indexMCP.x, 2) +
      Math.pow(thumbTip.y - indexMCP.y, 2)
    );
    const thumbCurled = thumbDistance < handSize * 0.8;

    return fingersCurled && thumbCurled;
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

    // Skip frames pour optimisation (traiter 1 frame sur 2)
    frameSkipRef.current++;
    if (frameSkipRef.current % 2 !== 0) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
      return;
    }

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

        const isOpenHand = !fistDetected;

        // Verifier si la main est dans la zone d'activation
        const inZone = (
          palmCenter.x >= ACTIVATION_ZONE.xMin &&
          palmCenter.x <= ACTIVATION_ZONE.xMax &&
          palmCenter.y >= ACTIVATION_ZONE.yMin &&
          palmCenter.y <= ACTIVATION_ZONE.yMax
        );

        // Gestion de la stabilisation pour activer le controle
        if (isOpenHand && inZone) {
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
                // Mettre a jour la progression de stabilisation
                const stabProgress = (now - stabilizationStartRef.current) / STABILIZATION_TIME;
                setStabilizationProgress(Math.min(1, stabProgress));

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
          // Hors zone ou poing ferme - desactiver
          if (controlActiveRef.current) {
            controlActiveRef.current = false;
            setIsControlActive(false);
          }
          lastStablePositionRef.current = null;
          stabilizationStartRef.current = null;
          setStabilizationProgress(0);
        }

        // Sauvegarder tous les landmarks pour le rendu
        setLandmarks(landmarks);

        // Mettre a jour la position avec les infos de zone et controle
        setHandPosition({
          x: palmCenter.x,
          y: palmCenter.y,
          isFist: fistDetected,
          inZone,
          isControlActive: controlActiveRef.current,
        });

        // Controle de rotation seulement si actif
        if (controlActiveRef.current && lastPositionRef.current !== null) {
          const deltaX = currentX - lastPositionRef.current;
          const threshold = 0.015;

          if (Math.abs(deltaX) > threshold) {
            const direction = deltaX > 0 ? -1 : 1;
            setSwipeDirection(direction);

            // Calculer la velocite (distance / temps)
            const velocity = Math.abs(deltaX) / Math.max(deltaTime, 8) * 1000;

            // La rotation depend de la velocite de la main
            // velocite faible (~0.5) = rotation lente
            // velocite elevee (~3+) = rotation rapide
            const velocityFactor = Math.min(velocity / 0.8, 6); // Cap a 6x, plus reactif
            const rotationAmount = Math.abs(deltaX) * sensitivity * velocityFactor * 2.5; // Multiplicateur 2.5x

            smoothedDeltaRef.current = smoothedDeltaRef.current * 0.2 + (direction * rotationAmount) * 0.8;
            setRotationDelta(smoothedDeltaRef.current);
          } else {
            smoothedDeltaRef.current *= 0.95;
            setRotationDelta(smoothedDeltaRef.current);
            if (Math.abs(smoothedDeltaRef.current) < 0.001) {
              setSwipeDirection(0);
            }
          }
        } else if (!controlActiveRef.current) {
          // Controle inactif - inertie
          smoothedDeltaRef.current *= 0.97;
          setRotationDelta(smoothedDeltaRef.current);
          if (Math.abs(smoothedDeltaRef.current) < 0.001) {
            setSwipeDirection(0);
          }
        }

        lastPositionRef.current = currentX;
      } else {
        // Pas de main detectee - reset et garder l'inertie
        setHandPosition(null);
        setLandmarks(null);
        setIsFist(false);
        setStabilizationProgress(0);
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
