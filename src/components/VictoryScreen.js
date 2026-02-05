import { useState, useEffect } from 'react';

/**
 * VictoryScreen
 *
 * Écran de victoire des joueurs
 * S'affiche quand l'infection est repoussée
 * Style digital vert (victoire)
 */
export function VictoryScreen({ visible = false }) {
  const [fadeIn, setFadeIn] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (visible) {
      setTimeout(() => setFadeIn(true), 100);
      setTimeout(() => setShowContent(true), 800);
    } else {
      setFadeIn(false);
      setShowContent(false);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: fadeIn ? 'rgba(0, 20, 0, 0.95)' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      transition: 'background-color 0.8s ease-out',
      overflow: 'hidden',
    }}>
      {/* Lignes de scan */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px)',
        pointerEvents: 'none',
      }} />

      {/* Contenu principal */}
      <div style={{
        textAlign: 'center',
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'scale(1)' : 'scale(0.9)',
        transition: 'all 0.6s ease-out',
      }}>
        {/* Icône de succès */}
        <div style={{
          fontSize: '80px',
          marginBottom: '30px',
          animation: 'pulse-green 2s infinite',
        }}>
          ✓
        </div>

        {/* Titre */}
        <h1 style={{
          fontFamily: '"Courier New", monospace',
          fontSize: 'clamp(32px, 6vw, 72px)',
          fontWeight: 'bold',
          color: '#00ff00',
          textTransform: 'uppercase',
          letterSpacing: '8px',
          margin: '0 0 20px 0',
          textShadow: '0 0 30px rgba(0, 255, 0, 0.8), 0 0 60px rgba(0, 255, 0, 0.4)',
          animation: 'glow-green 2s ease-in-out infinite alternate',
        }}>
          VICTOIRE
        </h1>

        {/* Sous-titre */}
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: 'clamp(16px, 3vw, 28px)',
          color: '#00cc00',
          letterSpacing: '4px',
          marginBottom: '40px',
          textShadow: '0 0 20px rgba(0, 255, 0, 0.5)',
        }}>
          L'HUMANITÉ A SURVÉCU
        </div>

        {/* Message */}
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '14px',
          color: '#00aa00',
          letterSpacing: '2px',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: '1.8',
        }}>
          <div style={{ marginBottom: '10px' }}>IA NEUTRALISÉE</div>
          <div style={{ marginBottom: '10px' }}>SYSTÈME STABILISÉ</div>
          <div>MENACE ÉLIMINÉE</div>
        </div>

        {/* Statut */}
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '12px',
          color: '#006600',
          letterSpacing: '2px',
          marginTop: '40px',
        }}>
          SIMULATION TERMINÉE
        </div>
      </div>

      {/* Coins décoratifs */}
      <div style={{
        position: 'absolute',
        top: '30px',
        left: '30px',
        width: '80px',
        height: '80px',
        borderTop: '3px solid #00ff00',
        borderLeft: '3px solid #00ff00',
        opacity: showContent ? 0.8 : 0,
        transition: 'opacity 0.5s ease-out 0.3s',
      }} />
      <div style={{
        position: 'absolute',
        top: '30px',
        right: '30px',
        width: '80px',
        height: '80px',
        borderTop: '3px solid #00ff00',
        borderRight: '3px solid #00ff00',
        opacity: showContent ? 0.8 : 0,
        transition: 'opacity 0.5s ease-out 0.3s',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '30px',
        width: '80px',
        height: '80px',
        borderBottom: '3px solid #00ff00',
        borderLeft: '3px solid #00ff00',
        opacity: showContent ? 0.8 : 0,
        transition: 'opacity 0.5s ease-out 0.3s',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '30px',
        right: '30px',
        width: '80px',
        height: '80px',
        borderBottom: '3px solid #00ff00',
        borderRight: '3px solid #00ff00',
        opacity: showContent ? 0.8 : 0,
        transition: 'opacity 0.5s ease-out 0.3s',
      }} />

      {/* Animations CSS */}
      <style>{`
        @keyframes pulse-green {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes glow-green {
          from { text-shadow: 0 0 30px rgba(0, 255, 0, 0.8), 0 0 60px rgba(0, 255, 0, 0.4); }
          to { text-shadow: 0 0 40px rgba(0, 255, 0, 1), 0 0 80px rgba(0, 255, 0, 0.6); }
        }
      `}</style>
    </div>
  );
}

export default VictoryScreen;
