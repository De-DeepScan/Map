import { useState, useEffect } from 'react';

/**
 * Composant InfectionUI
 *
 * Interface utilisateur pour le système d'infection
 * - Affichage des statistiques
 * - Contrôles de simulation
 */
export function InfectionUI({ stats = { infected: 0, routes: 0 } }) {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="infection-ui">
      <div className="infection-header">
        <span className="virus-icon">&#9763;</span>
        <span className="title">INFECTION OUTBREAK</span>
      </div>

      <div className="infection-stats">
        <div className="stat">
          <span className="stat-label">Foyers infectés</span>
          <span className="stat-value">{stats.infected}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Routes actives</span>
          <span className="stat-value">{stats.routes}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Temps écoulé</span>
          <span className="stat-value">{formatTime(time)}</span>
        </div>
      </div>

      <div className="infection-legend">
        <div className="legend-item">
          <span className="dot red"></span>
          <span>Zone infectée</span>
        </div>
        <div className="legend-item">
          <span className="line red"></span>
          <span>Transmission</span>
        </div>
      </div>
    </div>
  );
}

export default InfectionUI;
