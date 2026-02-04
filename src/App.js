import { useState, useEffect, useCallback } from 'react';
import { Scene } from './components';
import { StartOverlay } from './components/StartOverlay';
import { InfectionComplete } from './components/InfectionComplete';
import { VictoryScreen } from './components/VictoryScreen';
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
  const [triggerRegression, setTriggerRegression] = useState(false); // Declenche la regression
  const [playerVictory, setPlayerVictory] = useState(false); // Victoire des joueurs (regression terminee)

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
    if (!startTime || infectionComplete || triggerRegression || playerVictory) return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= TOTAL_TIME) {
        setInfectionComplete(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, infectionComplete, triggerRegression, playerVictory]);

  // Callback для завершения заражения (вызывается из Scene)
  const handleInfectionComplete = useCallback(() => {
    setInfectionComplete(true);
  }, []);

  // Callback pour la fin de la regression (victoire des joueurs)
  const handleRegressionComplete = useCallback(() => {
    setTriggerRegression(false);
    setPlayerVictory(true);
    gamemaster.updateState({
      phase: 'player_victory',
      infectionStarted: false,
      infectionComplete: false,
      playerVictory: true,
    });
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
    setTriggerRegression(false);
    setPlayerVictory(false);
    // Incrementer la cle pour forcer le remontage de la scene
    setSceneKey(prev => prev + 1);
  }, []);

  // Callback pour reset complet (remet à l'état initial sans overlay)
  const handleReset = useCallback(() => {
    setShowOverlay(false);
    setInfectionStarted(false);
    setInfectionComplete(false);
    setStartTime(null);
    setTriggerRegression(false);
    setPlayerVictory(false);
    setSceneKey(prev => prev + 1);
    // Mettre à jour l'état côté backoffice
    gamemaster.updateState({
      phase: 'idle',
      infectionStarted: false,
      infectionComplete: false,
      playerVictory: false,
    });
  }, []);

  // Enregistrement et écoute des commandes du gamemaster
  useEffect(() => {
    // Enregistrer l'application auprès du backoffice
    gamemaster.register('infection-map', 'Carte Infection', [
      { id: 'reset', label: 'Réinitialiser la carte' },
      { id: 'start_infection', label: 'Démarrer l\'infection' },
      { id: 'player_victory', label: 'Victoire joueurs (désactive IA)' },
      { id: 'restart', label: 'Redémarrer (après fin)' },
    ]);

    // Envoyer l'état initial
    gamemaster.updateState({
      phase: 'idle',
      infectionStarted: false,
      infectionComplete: false,
      playerVictory: false,
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
          setTriggerRegression(false);
          setPlayerVictory(false);
          gamemaster.updateState({
            phase: 'running',
            infectionStarted: true,
            infectionComplete: false,
            playerVictory: false,
          });
          break;

        case 'player_victory':
          // Victoire des joueurs - déclencher la régression de l'infection
          // Ne fonctionne que si l'infection est en cours et pas à 100%
          if (infectionStarted && !infectionComplete && !triggerRegression && !playerVictory) {
            console.log('[App] Déclenchement de la victoire joueurs - régression');
            setTriggerRegression(true);
            gamemaster.updateState({
              phase: 'regressing',
              infectionStarted: true,
              infectionComplete: false,
              playerVictory: false,
            });
          } else {
            console.warn('[App] Impossible de déclencher la victoire: infection non en cours ou déjà à 100%');
          }
          break;

        case 'restart':
          // Redémarrer après une infection terminée
          handleRestart();
          gamemaster.updateState({
            phase: 'idle',
            infectionStarted: false,
            infectionComplete: false,
            playerVictory: false,
          });
          break;

        default:
          console.warn('[App] Commande inconnue:', cmd.action);
      }
    });
  }, [handleReset, handleRestart, infectionStarted, infectionComplete, triggerRegression, playerVictory]);

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
          triggerRegression={triggerRegression}
          onRegressionComplete={handleRegressionComplete}
        />

        {/* Ecran final - Planete infectee (defaite) */}
        <InfectionComplete visible={infectionComplete} onRestart={handleRestart} />

        {/* Ecran de victoire - IA desactivee */}
        <VictoryScreen visible={playerVictory} onRestart={handleRestart} />
      </div>
    </GeoJsonProvider>
  );
}

export default App;
