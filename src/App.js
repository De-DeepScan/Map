import { useState, useEffect, useCallback } from 'react';
import { Scene } from './components';
import { StartOverlay } from './components/StartOverlay';
import { InfectionComplete } from './components/InfectionComplete';
import { GeoJsonProvider } from './context/GeoJsonContext';
import { gamemaster } from './gamemaster-client';
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

  // Callback pour reset complet (remet à l'état initial sans overlay)
  const handleReset = useCallback(() => {
    setShowOverlay(false);
    setInfectionStarted(false);
    setInfectionComplete(false);
    setStartTime(null);
    setSceneKey(prev => prev + 1);
    // Mettre à jour l'état côté backoffice
    gamemaster.updateState({
      phase: 'idle',
      infectionStarted: false,
      infectionComplete: false,
    });
  }, []);

  // Enregistrement et écoute des commandes du gamemaster
  useEffect(() => {
    // Enregistrer l'application auprès du backoffice
    gamemaster.register('infection-map', 'Carte Infection', [
      { id: 'reset', label: 'Réinitialiser la carte' },
      { id: 'start_infection', label: 'Démarrer l\'infection' },
      { id: 'restart', label: 'Redémarrer (après fin)' },
    ]);

    // Envoyer l'état initial
    gamemaster.updateState({
      phase: 'idle',
      infectionStarted: false,
      infectionComplete: false,
    });

    // Écouter les commandes du backoffice
    gamemaster.onCommand((cmd) => {
      console.log('[App] Commande reçue:', cmd.action);

      switch (cmd.action) {
        case 'reset':
          // Réinitialiser complètement la carte
          handleReset();
          break;

        case 'start_infection':
          // Démarrer l'infection (passe directement en mode infection)
          setShowOverlay(false);
          setInfectionStarted(true);
          gamemaster.updateState({
            phase: 'running',
            infectionStarted: true,
            infectionComplete: false,
          });
          break;

        case 'restart':
          // Redémarrer après une infection terminée
          handleRestart();
          gamemaster.updateState({
            phase: 'idle',
            infectionStarted: false,
            infectionComplete: false,
          });
          break;

        default:
          console.warn('[App] Commande inconnue:', cmd.action);
      }
    });
  }, [handleReset, handleRestart]);

  // Mettre à jour l'état du gamemaster quand l'infection démarre
  useEffect(() => {
    if (infectionStarted && !infectionComplete) {
      gamemaster.updateState({
        phase: 'running',
        infectionStarted: true,
        infectionComplete: false,
      });
    }
  }, [infectionStarted, infectionComplete]);

  // Mettre à jour l'état du gamemaster quand l'infection est terminée
  useEffect(() => {
    if (infectionComplete) {
      gamemaster.updateState({
        phase: 'completed',
        infectionStarted: true,
        infectionComplete: true,
      });
    }
  }, [infectionComplete]);

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
