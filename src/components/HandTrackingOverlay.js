import { useState, useEffect, useRef, useCallback } from 'react';
import { useHandTracking } from '../hooks/useHandTracking';

// Connexions entre les landmarks pour dessiner le squelette
const HAND_CONNECTIONS = [
  // Pouce
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Majeur
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Annulaire
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Auriculaire
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Paume
  [5, 9], [9, 13], [13, 17],
];

/**
 * HandTrackingOverlay
 *
 * Affiche un apercu de la camera et les indicateurs de geste
 * Transmet le delta de rotation au parent
 */
export function HandTrackingOverlay({
  enabled = true,
  onRotationChange,
  sensitivity = 2.0,
}) {
  const [showVideo, setShowVideo] = useState(true);
  const canvasRef = useRef(null);

  const {
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
    startCamera,
    stopCamera,
  } = useHandTracking({ enabled, sensitivity });

  // Dessiner le squelette de la main sur le canvas
  const drawHandSkeleton = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Couleur selon l'etat
    const color = isControlActive
      ? '#00ff00'
      : handPosition?.inZone && !isFist
        ? '#ffff00'
        : '#ff6666';

    // Dessiner les connexions
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    HAND_CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo((1 - p1.x) * width, p1.y * height);
        ctx.lineTo((1 - p2.x) * width, p2.y * height);
        ctx.stroke();
      }
    });

    // Dessiner les points
    landmarks.forEach((point, index) => {
      const x = (1 - point.x) * width;
      const y = point.y * height;

      // Points speciaux plus gros
      const isFingerTip = [4, 8, 12, 16, 20].includes(index);
      const isPalm = index === 9;

      ctx.beginPath();
      ctx.arc(x, y, isFingerTip ? 4 : isPalm ? 5 : 2, 0, Math.PI * 2);
      ctx.fillStyle = isPalm ? '#00ffff' : color;
      ctx.fill();

      // Cercle lumineux pour le centre de la paume
      if (isPalm) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [landmarks, isControlActive, handPosition, isFist]);

  // Redessiner le squelette quand les landmarks changent
  useEffect(() => {
    if (landmarks) {
      drawHandSkeleton();
    } else if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [landmarks, drawHandSkeleton]);

  // Demarrer la camera automatiquement
  useEffect(() => {
    if (isReady && enabled) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isReady, enabled, startCamera, stopCamera]);

  // Transmettre le delta de rotation au parent
  useEffect(() => {
    if (onRotationChange && isTracking) {
      onRotationChange(rotationDelta);
    }
  }, [rotationDelta, onRotationChange, isTracking]);

  if (!enabled) return null;

  return (
    <div style={styles.container}>
      {/* Apercu camera */}
      <div style={styles.videoContainer}>
        <video
          ref={videoRef}
          style={{
            ...styles.video,
            display: showVideo ? 'block' : 'none',
          }}
          playsInline
          muted
        />

        {/* Canvas pour le squelette de la main */}
        <canvas
          ref={canvasRef}
          width={160}
          height={120}
          style={styles.skeletonCanvas}
        />

        {/* Barre de progression de stabilisation */}
        {stabilizationProgress > 0 && !isControlActive && (
          <div style={styles.stabilizationBar}>
            <div
              style={{
                ...styles.stabilizationFill,
                width: `${stabilizationProgress * 100}%`,
              }}
            />
          </div>
        )}

        {/* Indicateur d'etat */}
        {handPosition && (
          <div style={styles.stateIndicator}>
            {isControlActive ? '🎮' : handPosition.inZone && !isFist ? '⏳' : '👆'}
          </div>
        )}

        {/* Badge "ACTIF" quand le controle est actif */}
        {isControlActive && (
          <div style={styles.activeBadge}>ACTIF</div>
        )}

        {/* Fleches de direction - seulement si controle actif et mouvement */}
        {isControlActive && swipeDirection !== 0 && (
          <div style={styles.directionOverlay}>
            <span style={styles.arrow}>
              {swipeDirection < 0 ? '←' : '→'}
            </span>
          </div>
        )}

        {/* Bouton toggle video */}
        <button
          style={styles.toggleButton}
          onClick={() => setShowVideo(!showVideo)}
        >
          {showVideo ? '👁' : '👁‍🗨'}
        </button>
      </div>

      {/* Status */}
      <div style={styles.status}>
        {!isReady && <span style={styles.loading}>Chargement...</span>}
        {isReady && !isTracking && <span>Camera inactive</span>}
        {isTracking && !handPosition && <span>Placez votre main dans la zone</span>}
        {isTracking && handPosition && !handPosition.inZone && (
          <span style={styles.hint}>Main hors zone</span>
        )}
        {isTracking && handPosition && handPosition.inZone && isFist && (
          <span style={styles.hint}>Ouvrez la main</span>
        )}
        {isTracking && handPosition && handPosition.inZone && !isFist && !isControlActive && (
          <span style={styles.waiting}>Stabilisation...</span>
        )}
        {isTracking && isControlActive && (
          <span style={styles.active}>
            {swipeDirection < 0 ? '← Gauche' : swipeDirection > 0 ? 'Droite →' : 'Controle actif'}
          </span>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  },
  videoContainer: {
    position: 'relative',
    width: '160px',
    height: '120px',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '2px solid rgba(0, 255, 255, 0.5)',
    boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
    background: 'rgba(0, 0, 0, 0.8)',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)', // Miroir
  },
  handIndicator: {
    position: 'absolute',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'rgba(255, 0, 0, 0.7)',
    border: '2px solid #fff',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)',
  },
  directionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.3)',
    pointerEvents: 'none',
  },
  arrow: {
    fontSize: '48px',
    color: '#00ffff',
    textShadow: '0 0 20px #00ffff',
  },
  toggleButton: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '24px',
    height: '24px',
    border: 'none',
    borderRadius: '4px',
    background: 'rgba(0, 0, 0, 0.5)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'monospace',
    textShadow: '0 0 5px rgba(0, 0, 0, 0.8)',
  },
  loading: {
    color: '#ffaa00',
  },
  active: {
    color: '#00ff88',
  },
  hint: {
    color: '#ff6666',
  },
  waiting: {
    color: '#ffff00',
  },
  skeletonCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  stabilizationBar: {
    position: 'absolute',
    bottom: '8px',
    left: '10%',
    width: '80%',
    height: '4px',
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  stabilizationFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ffff00, #00ff00)',
    borderRadius: '2px',
    transition: 'width 0.1s ease-out',
  },
  stateIndicator: {
    position: 'absolute',
    bottom: '4px',
    left: '4px',
    fontSize: '14px',
    textShadow: '0 0 5px rgba(0, 0, 0, 0.8)',
  },
  activeBadge: {
    position: 'absolute',
    top: '4px',
    left: '4px',
    padding: '2px 6px',
    background: 'rgba(0, 255, 0, 0.8)',
    color: '#000',
    fontSize: '9px',
    fontWeight: 'bold',
    borderRadius: '3px',
    fontFamily: 'monospace',
  },
};

export default HandTrackingOverlay;
