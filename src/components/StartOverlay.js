import { useState, useEffect } from 'react';

/**
 * StartOverlay - Overlay d'attente avant le démarrage de l'infection
 * Affiche "ATTENTION" et attend une touche pour démarrer
 */
export function StartOverlay({ visible, onStart }) {
  const [opacity, setOpacity] = useState(0);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Animation d'apparition
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setOpacity(1), 100);
      return () => clearTimeout(timer);
    } else {
      setOpacity(0);
    }
  }, [visible]);

  // Animation de pulsation du texte
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setPulsePhase(p => (p + 1) % 60);
    }, 50);

    return () => clearInterval(interval);
  }, [visible]);

  // Ecouter les touches du clavier
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e) => {
      // Ignorer certaines touches systeme
      if (e.key === 'F5' || e.key === 'F12' || e.ctrlKey || e.altKey || e.metaKey) return;
      onStart();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onStart]);

  if (!visible) return null;

  const pulseOpacity = 0.5 + Math.sin(pulsePhase * 0.1) * 0.5;

  return (
    <div style={{ ...styles.container, opacity }}>
      <div style={styles.content}>
        {/* Titre ATTENTION */}
        <div style={styles.warningIcon}>&#9888;</div>
        <h1 style={styles.title}>ATTENTION</h1>

        <div style={styles.separator} />

        {/* Message */}
        <p style={styles.subtitle}>
          Simulation d'infection mondiale
        </p>

        {/* Instruction */}
        <div style={{ ...styles.instruction, opacity: pulseOpacity }}>
          Appuyez sur une touche pour lancer l'infection
        </div>

        {/* Barre de chargement animee */}
        <div style={styles.loadingBar}>
          <div style={styles.loadingFill} />
        </div>
      </div>

      {/* Coins decoratifs */}
      <div style={{ ...styles.corner, top: 20, left: 20 }} />
      <div style={{ ...styles.corner, top: 20, right: 20, transform: 'rotate(90deg)' }} />
      <div style={{ ...styles.corner, bottom: 20, left: 20, transform: 'rotate(-90deg)' }} />
      <div style={{ ...styles.corner, bottom: 20, right: 20, transform: 'rotate(180deg)' }} />
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    transition: 'opacity 0.5s ease-in-out',
  },
  content: {
    textAlign: 'center',
    color: '#fff',
    fontFamily: "'Courier New', monospace",
  },
  warningIcon: {
    fontSize: '80px',
    color: '#ff3333',
    textShadow: '0 0 30px rgba(255, 0, 0, 0.8)',
    marginBottom: '10px',
    animation: 'pulse 1s infinite',
  },
  title: {
    fontSize: '72px',
    fontWeight: 'bold',
    color: '#ff3333',
    textShadow: '0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.4)',
    margin: 0,
    letterSpacing: '15px',
  },
  separator: {
    width: '300px',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #ff3333, transparent)',
    margin: '30px auto',
  },
  subtitle: {
    fontSize: '24px',
    color: '#ff6666',
    margin: '20px 0',
    letterSpacing: '3px',
  },
  instruction: {
    fontSize: '18px',
    color: '#00ffff',
    marginTop: '40px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    transition: 'opacity 0.1s',
  },
  loadingBar: {
    width: '200px',
    height: '4px',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '2px',
    margin: '30px auto 0',
    overflow: 'hidden',
  },
  loadingFill: {
    width: '30%',
    height: '100%',
    background: 'linear-gradient(90deg, #ff0000, #ff6666)',
    borderRadius: '2px',
    animation: 'loadingSlide 1.5s infinite',
  },
  corner: {
    position: 'absolute',
    width: '40px',
    height: '40px',
    borderTop: '3px solid #ff3333',
    borderLeft: '3px solid #ff3333',
  },
};

// Ajouter les animations CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
  @keyframes loadingSlide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
`;
document.head.appendChild(styleSheet);

export default StartOverlay;
