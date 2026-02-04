import { useState, useEffect } from 'react';

/**
 * VictoryScreen
 *
 * Ecran de victoire des joueurs - L'IA a ete desactivee
 * - Style digital vert
 * - "Menace neutralisee"
 */
export function VictoryScreen({ visible = false, onRestart = null }) {
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
      right: 0,
      bottom: 0,
      backgroundColor: fadeIn ? 'rgba(0, 10, 5, 0.95)' : 'transparent',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      transition: 'background-color 1.5s ease-in',
    }}>
      {/* Scanlines */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 100, 0.02) 2px, rgba(0, 255, 100, 0.02) 4px)',
        pointerEvents: 'none',
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 1s ease-in',
      }} />

      {/* Contenu */}
      <div style={{
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'scale(1)' : 'scale(0.9)',
        transition: 'all 1s ease-out',
        textAlign: 'center',
      }}>
        {/* Icone bouclier / check */}
        <div style={{
          fontSize: '100px',
          marginBottom: '40px',
          color: '#00ff66',
          textShadow: '0 0 30px #00ff66, 0 0 60px #00ff66, 0 0 90px #00ff66',
          animation: 'pulse-victory 2s ease-in-out infinite',
        }}>
          ✓
        </div>

        {/* Texte principal */}
        <div style={{
          fontFamily: '"Courier New", "Consolas", monospace',
          fontSize: '72px',
          fontWeight: 'bold',
          color: '#00ff66',
          letterSpacing: '8px',
          textTransform: 'uppercase',
          textShadow: '0 0 20px #00ff66, 0 0 40px #00ff66, 0 0 80px rgba(0, 255, 102, 0.5)',
          marginBottom: '20px',
        }}>
          MENACE
        </div>

        <div style={{
          fontFamily: '"Courier New", "Consolas", monospace',
          fontSize: '72px',
          fontWeight: 'bold',
          color: '#00ff66',
          letterSpacing: '8px',
          textTransform: 'uppercase',
          textShadow: '0 0 20px #00ff66, 0 0 40px #00ff66, 0 0 80px rgba(0, 255, 102, 0.5)',
        }}>
          NEUTRALISÉE
        </div>

        {/* Ligne */}
        <div style={{
          width: '500px',
          height: '2px',
          backgroundColor: '#00ff66',
          margin: '50px auto',
          boxShadow: '0 0 20px #00ff66, 0 0 40px #00ff66',
          animation: 'line-pulse-victory 1.5s ease-in-out infinite',
        }} />

        {/* Status */}
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '18px',
          color: '#00ffff',
          letterSpacing: '4px',
          textShadow: '0 0 10px #00ffff',
          marginBottom: '15px',
        }}>
          IA DÉSACTIVÉE
        </div>

        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '14px',
          color: '#00ff66',
          letterSpacing: '3px',
          opacity: 0.8,
        }}>
          ░░░ PLANÈTE SAUVÉE ░░░
        </div>

        {/* Message */}
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '12px',
          color: '#666',
          letterSpacing: '2px',
          marginTop: '40px',
        }}>
          VICTOIRE DES JOUEURS
        </div>

        {/* Bouton de redemarrage */}
        {onRestart && (
          <button
            onClick={onRestart}
            style={{
              marginTop: '50px',
              padding: '15px 40px',
              fontFamily: '"Courier New", monospace',
              fontSize: '16px',
              fontWeight: 'bold',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: '#00ffff',
              backgroundColor: 'transparent',
              border: '2px solid #00ffff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.1)';
              e.target.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.6)';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ⟲ RECOMMENCER
          </button>
        )}
      </div>

      {/* Coins du cadre */}
      <div style={{
        position: 'absolute',
        top: '30px',
        left: '30px',
        width: '80px',
        height: '80px',
        borderTop: '3px solid #00ff66',
        borderLeft: '3px solid #00ff66',
        boxShadow: '0 0 20px rgba(0, 255, 102, 0.5)',
        opacity: showContent ? 1 : 0,
        transition: 'opacity 1s ease-in 0.5s',
      }} />
      <div style={{
        position: 'absolute',
        top: '30px',
        right: '30px',
        width: '80px',
        height: '80px',
        borderTop: '3px solid #00ff66',
        borderRight: '3px solid #00ff66',
        boxShadow: '0 0 20px rgba(0, 255, 102, 0.5)',
        opacity: showContent ? 1 : 0,
        transition: 'opacity 1s ease-in 0.5s',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '30px',
        width: '80px',
        height: '80px',
        borderBottom: '3px solid #00ff66',
        borderLeft: '3px solid #00ff66',
        boxShadow: '0 0 20px rgba(0, 255, 102, 0.5)',
        opacity: showContent ? 1 : 0,
        transition: 'opacity 1s ease-in 0.5s',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '30px',
        right: '30px',
        width: '80px',
        height: '80px',
        borderBottom: '3px solid #00ff66',
        borderRight: '3px solid #00ff66',
        boxShadow: '0 0 20px rgba(0, 255, 102, 0.5)',
        opacity: showContent ? 1 : 0,
        transition: 'opacity 1s ease-in 0.5s',
      }} />

      {/* CSS animations */}
      <style>{`
        @keyframes pulse-victory {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes line-pulse-victory {
          0%, 100% {
            opacity: 1;
            width: 500px;
          }
          50% {
            opacity: 0.7;
            width: 520px;
          }
        }
      `}</style>
    </div>
  );
}

export default VictoryScreen;
