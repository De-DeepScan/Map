import { useState, useEffect } from 'react';

/**
 * InfectionHUD
 *
 * Panneau avec la progression de l'infection et le compte à rebours
 * - Compte à rebours de 5 minutes
 * - Barre de progression de l'infection
 * - Style digital
 */

const DEFAULT_TOTAL_TIME = 5 * 60 * 1000; // 5 minutes en millisecondes

export function InfectionHUD({
  infectionProgress = 0,  // 0-100%
  startTime = null,
  totalCountries = 200,
  infectedCountries = 0,
  totalTime = DEFAULT_TOTAL_TIME,  // Peut être redéfini depuis gamemaster
}) {
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Compte à rebours
  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, totalTime - elapsed);
      setTimeLeft(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, totalTime]);

  // Animation fluide de la progression
  useEffect(() => {
    const targetProgress = Math.min(100, (infectedCountries / totalCountries) * 100);

    const animate = () => {
      setDisplayProgress(prev => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 0.5) return targetProgress;
        return prev + diff * 0.1;
      });
    };

    const interval = setInterval(animate, 50);
    return () => clearInterval(interval);
  }, [infectedCountries, totalCountries]);

  // Formatage du temps
  const formatTime = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Couleur de progression selon le niveau
  const getProgressColor = () => {
    if (displayProgress < 30) return '#00ff00';
    if (displayProgress < 60) return '#ffff00';
    if (displayProgress < 90) return '#ff8800';
    return '#ff0044';
  };

  const progressColor = getProgressColor();

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      zIndex: 100,
      fontFamily: '"Courier New", "Consolas", monospace',
    }}>
      {/* Conteneur HUD */}
      <div style={{
        backgroundColor: 'rgba(0, 10, 20, 0.9)',
        border: '1px solid #00ffff',
        padding: '15px 20px',
        minWidth: '280px',
        boxShadow: '0 0 20px rgba(0, 255, 255, 0.3), inset 0 0 30px rgba(0, 255, 255, 0.05)',
      }}>
        {/* En-tête */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '15px',
          borderBottom: '1px solid rgba(0, 255, 255, 0.3)',
          paddingBottom: '10px',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#ff0044',
            marginRight: '10px',
            animation: 'hud-blink 0.5s infinite',
            boxShadow: '0 0 10px #ff0044',
          }} />
          <span style={{
            color: '#ff0044',
            fontSize: '12px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            textShadow: '0 0 10px #ff0044',
          }}>
            OUTBREAK STATUS
          </span>
        </div>

        {/* Timer compte à rebours */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
        }}>
          <span style={{
            color: '#00ffff',
            fontSize: '11px',
            letterSpacing: '2px',
            opacity: 0.8,
          }}>
            TIME REMAINING
          </span>
          <span style={{
            color: timeLeft < 60000 ? '#ff0044' : '#00ffff',
            fontSize: '24px',
            fontWeight: 'bold',
            letterSpacing: '2px',
            textShadow: `0 0 15px ${timeLeft < 60000 ? '#ff0044' : '#00ffff'}`,
            animation: timeLeft < 60000 ? 'hud-blink 0.5s infinite' : 'none',
          }}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Barre de progression */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '5px',
          }}>
            <span style={{
              color: '#00ffff',
              fontSize: '11px',
              letterSpacing: '2px',
              opacity: 0.8,
            }}>
              INFECTION RATE
            </span>
            <span style={{
              color: progressColor,
              fontSize: '14px',
              fontWeight: 'bold',
              textShadow: `0 0 10px ${progressColor}`,
            }}>
              {displayProgress.toFixed(1)}%
            </span>
          </div>

          {/* Barre de progression */}
          <div style={{
            height: '20px',
            backgroundColor: 'rgba(0, 20, 40, 0.8)',
            border: '1px solid #00ffff',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Remplissage */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${displayProgress}%`,
              background: `linear-gradient(90deg, ${progressColor}88, ${progressColor})`,
              boxShadow: `0 0 20px ${progressColor}, inset 0 0 10px rgba(255,255,255,0.3)`,
              transition: 'width 0.3s ease-out',
            }} />

            {/* Lignes de scan */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
              pointerEvents: 'none',
            }} />

            {/* Ligne animée */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
              animation: 'hud-scan 2s linear infinite',
              pointerEvents: 'none',
            }} />
          </div>
        </div>

        {/* Statistiques */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(0, 255, 255, 0.3)',
          paddingTop: '10px',
          marginTop: '5px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              color: progressColor,
              fontSize: '18px',
              fontWeight: 'bold',
              textShadow: `0 0 10px ${progressColor}`,
            }}>
              {infectedCountries}
            </div>
            <div style={{
              color: '#00ffff',
              fontSize: '9px',
              letterSpacing: '1px',
              opacity: 0.7,
            }}>
              INFECTED
            </div>
          </div>

          <div style={{
            width: '1px',
            backgroundColor: 'rgba(0, 255, 255, 0.3)',
          }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{
              color: '#00ff00',
              fontSize: '18px',
              fontWeight: 'bold',
              textShadow: '0 0 10px #00ff00',
            }}>
              {totalCountries - infectedCountries}
            </div>
            <div style={{
              color: '#00ffff',
              fontSize: '9px',
              letterSpacing: '1px',
              opacity: 0.7,
            }}>
              REMAINING
            </div>
          </div>
        </div>
      </div>

      {/* Animations CSS */}
      <style>{`
        @keyframes hud-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        @keyframes hud-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

export default InfectionHUD;
