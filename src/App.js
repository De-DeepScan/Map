import { useState, useEffect, useCallback } from 'react';
import { Scene } from './components';
import { StartOverlay } from './components/StartOverlay';
import { InfectionComplete } from './components/InfectionComplete';
import { VictoryScreen } from './components/VictoryScreen';
import { DilemmeVideoPopup } from './components/DilemmeVideoPopup';
import { GeoJsonProvider } from './context/GeoJsonContext';
import { gamemaster } from './gamemaster-client';
import './App.css';

const TOTAL_TIME = 15 * 60 * 1000; // 15 minutes

/**
 * Composant App
 *
 * Composant principal de l'application
 * Affiche la scène 3D avec la planète Terre et le système d'infection
 * Intégration avec le backoffice via gamemaster
 */
function App() {
  const [showOverlay, setShowOverlay] = useState(false); // Overlay ATTENTION visible
  const [infectionStarted, setInfectionStarted] = useState(false); // Infection demarre apres overlay
  const [infectionComplete, setInfectionComplete] = useState(false);
  const [playerVictory, setPlayerVictory] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [appKey, setAppKey] = useState(0); // Pour forcer le reset complet

  // État pour les dilemmes
  const [currentDilemme, setCurrentDilemme] = useState(null);

  // Enregistrement auprès du backoffice
  useEffect(() => {
    gamemaster.register('infection-map', 'Carte Infection', [
      { id: 'reset', label: 'Réinitialiser' },
      { id: 'start_infection', label: 'Démarrer l\'infection' },
      { id: 'player_victory', label: 'Victoire joueurs' },
      { id: 'restart', label: 'Redémarrer' },
      { id: 'show_dilemme', label: 'Afficher dilemme', params: ['dilemmeId', 'choiceId'] },
      { id: 'hide_dilemme', label: 'Masquer dilemme' },
    ]);

    // Écoute des commandes du backoffice
    gamemaster.onCommand(({ action, payload }) => {
      console.log('[App] Commande reçue:', action, payload);

      switch (action) {
        case 'reset':
          // Réinitialise tout sans redémarrer
          setInfectionStarted(false);
          setShowOverlay(false);
          setInfectionComplete(false);
          setPlayerVictory(false);
          setStartTime(null);
          setCurrentDilemme(null);
          gamemaster.updateState({ status: 'reset', infected: 0 });
          break;

        case 'start_infection':
          // Démarre l'infection (skip l'intro)
          setInfectionStarted(true);
          setInfectionComplete(false);
          setPlayerVictory(false);
          gamemaster.updateState({ status: 'infection_started' });
          break;

        case 'player_victory':
          // Victoire des joueurs
          setPlayerVictory(true);
          setInfectionComplete(false);
          gamemaster.updateState({ status: 'player_victory' });
          break;

        case 'restart':
          // Redémarrage complet de l'application
          setInfectionStarted(false);
          setShowOverlay(false);
          setInfectionComplete(false);
          setPlayerVictory(false);
          setStartTime(null);
          setCurrentDilemme(null);
          setAppKey(prev => prev + 1); // Force le remount
          gamemaster.updateState({ status: 'restarted', infected: 0 });
          break;

        case 'show_dilemme':
          // Affiche un dilemme avec sa vidéo
          const dilemmeId = payload.dilemmeId || payload.dilemme_id;
          const choiceId = payload.choiceId || payload.choice_id;
          if (dilemmeId && choiceId) {
            setCurrentDilemme({ dilemmeId, choiceId });
            gamemaster.updateState({ status: 'dilemme_shown', dilemmeId, choiceId });
          }
          break;

        case 'hide_dilemme':
          // Masque le dilemme en cours
          setCurrentDilemme(null);
          gamemaster.updateState({ status: 'dilemme_hidden' });
          break;

        default:
          console.warn('[App] Commande inconnue:', action);
      }
    });

    // État initial
    gamemaster.updateState({ status: 'ready', infected: 0 });
  }, []);

  // Gestion des paramètres URL pour le test des dilemmes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dilemmeId = params.get('dilemme');
    const choiceId = params.get('choice');

    if (dilemmeId && choiceId) {
      console.log('[App] Test dilemme via URL:', dilemmeId, choiceId);
      setCurrentDilemme({ dilemmeId, choiceId });
    }
  }, []);

  // Démarrage du timer après l'intro
  useEffect(() => {
    if (infectionStarted && !startTime) {
      setStartTime(Date.now());
      gamemaster.updateState({ status: 'infection_running' });
    }
  }, [infectionStarted, startTime]);

  // Vérification du temps écoulé (15 minutes)
  useEffect(() => {
    if (!startTime || infectionComplete || playerVictory) return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= TOTAL_TIME) {
        setInfectionComplete(true);
        gamemaster.updateState({ status: 'infection_complete' });
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, infectionComplete, playerVictory]);

  // Callback pour la fin de l'infection (appelé depuis Scene)
  const handleInfectionComplete = useCallback(() => {
    if (!playerVictory) {
      setInfectionComplete(true);
      gamemaster.updateState({ status: 'infection_complete' });
    }
  }, [playerVictory]);

  // Callback pour fermer le dilemme
  const handleDilemmeClose = useCallback(() => {
    setCurrentDilemme(null);
    gamemaster.updateState({ status: 'dilemme_closed' });
  }, []);

  return (
    <GeoJsonProvider>
    <div className="App" key={appKey}>
      {/* Écran d'introduction */}
      {!infectionStarted && (
        <StartOverlay onComplete={() => setInfectionStarted(true)} />
      )}

      {/* Scène 3D avec la Terre et l'infection */}
      <Scene
        startAnimation={infectionStarted}
        onInfectionComplete={handleInfectionComplete}
      />

      {/* Popup vidéo des dilemmes */}
      {currentDilemme && (
        <DilemmeVideoPopup
          dilemmeId={currentDilemme.dilemmeId}
          choiceId={currentDilemme.choiceId}
          onClose={handleDilemmeClose}
        />
      )}

      {/* Écran de victoire des joueurs */}
      <VictoryScreen visible={playerVictory} />

      {/* Écran final - Planète infectée */}
      <InfectionComplete visible={infectionComplete && !playerVictory} />
    </div>
    </GeoJsonProvider>
  );
}

export default App;
