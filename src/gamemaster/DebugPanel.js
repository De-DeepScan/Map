import { useState } from 'react';
import { useGame } from './GameContext';

/**
 * DebugPanel
 *
 * Panneau pour tester les commandes gamemaster sans backoffice
 * Affiche le statut de connexion et permet d'appeler les commandes manuellement
 *
 * Utilisation: ajouter ?debug dans l'URL (ex: http://localhost:3000?debug)
 */
export function DebugPanel() {
  const {
    // State
    introComplete,
    infectionComplete,
    showAlert,
    remainingTime,
    totalTime,
    gameKey,
    isConnected,

    // Actions
    restartGame,
    resetTimer,
    setTimer,
    triggerAlert,
    showInfected,
    hideInfected,
  } = useGame();

  const [timerValue, setTimerValue] = useState(300); // 5 minutes par défaut
  const [isMinimized, setIsMinimized] = useState(false);

  // Vérifier le paramètre ?debug dans l'URL
  const showDebug = window.location.search.includes('debug');

  if (!showDebug) return null;

  const formatTime = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 99999,
          backgroundColor: 'rgba(0, 20, 40, 0.95)',
          border: '1px solid #00ffff',
          padding: '10px 15px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#00ffff',
        }}
      >
        🎮 Debug [+]
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 99999,
      backgroundColor: 'rgba(0, 20, 40, 0.95)',
      border: '1px solid #00ffff',
      padding: '15px',
      minWidth: '280px',
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#00ffff',
      boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        paddingBottom: '10px',
        borderBottom: '1px solid rgba(0, 255, 255, 0.3)',
      }}>
        <span style={{ fontWeight: 'bold', letterSpacing: '2px' }}>
          🎮 GAMEMASTER DEBUG
        </span>
        <button
          onClick={() => setIsMinimized(true)}
          style={{
            background: 'none',
            border: '1px solid #00ffff',
            color: '#00ffff',
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: '10px',
          }}
        >
          −
        </button>
      </div>

      {/* Statut de connexion */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '15px',
        padding: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: isConnected() ? '#00ff00' : '#ff0044',
          marginRight: '10px',
          boxShadow: `0 0 10px ${isConnected() ? '#00ff00' : '#ff0044'}`,
        }} />
        <span>
          Backoffice: {isConnected() ? 'CONNECTÉ' : 'DÉCONNECTÉ'}
        </span>
      </div>

      {/* État actuel */}
      <div style={{
        marginBottom: '15px',
        padding: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        fontSize: '11px',
      }}>
        <div style={{ marginBottom: '5px', color: '#888' }}>ÉTAT ACTUEL:</div>
        <div>introComplete: <span style={{ color: introComplete ? '#00ff00' : '#ff0044' }}>{String(introComplete)}</span></div>
        <div>infectionComplete: <span style={{ color: infectionComplete ? '#00ff00' : '#ff0044' }}>{String(infectionComplete)}</span></div>
        <div>showAlert: <span style={{ color: showAlert ? '#00ff00' : '#ff0044' }}>{String(showAlert)}</span></div>
        <div>remainingTime: <span style={{ color: '#ffff00' }}>{formatTime(remainingTime)}</span></div>
        <div>totalTime: <span style={{ color: '#ffff00' }}>{formatTime(totalTime)}</span></div>
        <div>gameKey: <span style={{ color: '#ffff00' }}>{gameKey}</span></div>
      </div>

      {/* Commandes */}
      <div style={{ marginBottom: '10px', color: '#888' }}>COMMANDES:</div>

      {/* Restart */}
      <button
        onClick={restartGame}
        style={buttonStyle('#00ffff')}
      >
        🔄 REDÉMARRER LE JEU
      </button>

      {/* Show Alert */}
      <button
        onClick={triggerAlert}
        style={buttonStyle('#ff8800')}
      >
        ⚠️ AFFICHER ALERT
      </button>

      {/* Show/Hide Infected */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
        <button
          onClick={showInfected}
          style={{ ...buttonStyle('#ff0044'), flex: 1 }}
        >
          ☣️ AFFICHER INFECTÉ
        </button>
        <button
          onClick={hideInfected}
          style={{ ...buttonStyle('#00ff00'), flex: 1 }}
        >
          ✓ MASQUER INFECTÉ
        </button>
      </div>

      {/* Contrôles du timer */}
      <div style={{
        marginTop: '10px',
        padding: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{ marginBottom: '8px', color: '#888' }}>CONTRÔLES DU TIMER:</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
          <input
            type="number"
            value={timerValue}
            onChange={(e) => setTimerValue(parseInt(e.target.value) || 0)}
            style={{
              width: '80px',
              padding: '5px',
              backgroundColor: '#001020',
              border: '1px solid #00ffff',
              color: '#00ffff',
              fontFamily: 'monospace',
            }}
          />
          <span style={{ color: '#888' }}>secondes</span>
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => resetTimer(timerValue)}
            style={{ ...buttonStyle('#ffff00'), flex: 1 }}
          >
            RESET TIMER
          </button>
          <button
            onClick={() => setTimer(timerValue)}
            style={{ ...buttonStyle('#ff00ff'), flex: 1 }}
          >
            DÉFINIR TIMER
          </button>
        </div>
      </div>

      {/* Préréglages rapides du timer */}
      <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
        {[30, 60, 120, 300].map(sec => (
          <button
            key={sec}
            onClick={() => {
              setTimerValue(sec);
              resetTimer(sec);
            }}
            style={{
              ...buttonStyle('#666'),
              flex: 1,
              padding: '5px',
              fontSize: '10px',
            }}
          >
            {sec}s
          </button>
        ))}
      </div>
    </div>
  );
}

const buttonStyle = (color) => ({
  display: 'block',
  width: '100%',
  padding: '8px',
  marginBottom: '5px',
  backgroundColor: 'transparent',
  border: `1px solid ${color}`,
  color: color,
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: '11px',
  letterSpacing: '1px',
  transition: 'all 0.2s',
});

export default DebugPanel;
