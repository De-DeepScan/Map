import { useState, useEffect, useCallback } from 'react';
import { Scene } from './components';
import { StartOverlay } from './components/StartOverlay';
import { InfectionComplete } from './components/InfectionComplete';
import { GeoJsonProvider } from './context/GeoJsonContext';
import './App.css';

const TOTAL_TIME = 5 * 60 * 1000; // 5 minutes

// Styles pour l'indication de demarrage
const styles = {
  startHint: {
    position: 'fixed',
    bottom: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '16px',
    fontFamily: "'Courier New', monospace",
    letterSpacing: '2px',
    textTransform: 'uppercase',
    zIndex: 100,
    animation: 'pulse 2s infinite',
    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
  },
};

/**
 * Composant App
 *
 * Composant principal de l'application
 * Affiche la scène 3D avec la planète Terre et le système d'infection
 */
function App() {
  const [showOverlay, setShowOverlay] = useState(false); // Overlay ATTENTION visible
  const [infectionStarted, setInfectionStarted] = useState(false); // Infection demarre apres overlay
  const [infectionComplete, setInfectionComplete] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [sceneKey, setSceneKey] = useState(0); // Cle pour forcer le reset de la scene

  // Ecouter l'appui sur une touche pour afficher l'overlay
  useEffect(() => {
    if (showOverlay || infectionStarted) return; // Deja en cours

    const handleKeyDown = (e) => {
      // Ignorer certaines touches systeme
      if (e.key === 'F5' || e.key === 'F12' || e.ctrlKey || e.altKey || e.metaKey) return;
      setShowOverlay(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOverlay, infectionStarted]);

  // Demarrer le timer quand l'infection commence
  useEffect(() => {
    if (infectionStarted && !startTime) {
      setStartTime(Date.now());
    }
  }, [infectionStarted, startTime]);

  // Проверяем прошло ли 5 минут
  useEffect(() => {
    if (!startTime || infectionComplete) return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= TOTAL_TIME) {
        setInfectionComplete(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, infectionComplete]);

  // Callback для завершения заражения (вызывается из Scene)
  const handleInfectionComplete = useCallback(() => {
    setInfectionComplete(true);
  }, []);

  // Callback pour demarrer l'infection
  const handleStartInfection = useCallback(() => {
    setInfectionStarted(true);
  }, []);

  // Callback pour redemarrer la simulation
  const handleRestart = useCallback(() => {
    setShowOverlay(false);
    setInfectionStarted(false);
    setInfectionComplete(false);
    setStartTime(null);
    // Incrementer la cle pour forcer le remontage de la scene
    setSceneKey(prev => prev + 1);
  }, []);

  return (
    <GeoJsonProvider>
      <div className="App">
        {/* Indication pour demarrer (en bas de l'ecran) */}
        {!showOverlay && !infectionStarted && (
          <div style={styles.startHint}>
            Appuyez sur une touche pour demarrer
          </div>
        )}

        {/* Overlay ATTENTION - s'affiche apres appui sur une touche */}
        <StartOverlay
          visible={showOverlay && !infectionStarted}
          onStart={handleStartInfection}
        />

        {/* Scene 3D avec la Terre et l'infection */}
        <Scene
          key={sceneKey}
          startAnimation={infectionStarted}
          startCameraAnimation={showOverlay}
          onInfectionComplete={handleInfectionComplete}
          totalInfectionTime={TOTAL_TIME}
        />

        {/* Ecran final - Planete infectee */}
        <InfectionComplete visible={infectionComplete} onRestart={handleRestart} />
      </div>
    </GeoJsonProvider>
  );
}

export default App;
