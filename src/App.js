import { Scene } from './components';
import { AlertIntro } from './components/AlertIntro';
import { InfectionComplete } from './components/InfectionComplete';
import { GameProvider, useGame, DebugPanel } from './gamemaster';
import './App.css';

/**
 * GameContent
 *
 * Contenu principal du jeu, utilise le contexte GameProvider
 */
function GameContent() {
  const {
    introComplete,
    infectionComplete,
    showAlert,
    gameKey,
    onAlertComplete,
    handleInfectionComplete,
    setIntroComplete,
  } = useGame();

  // Gérer la fin de l'intro (soit au démarrage, soit après une commande show_alert)
  const handleIntroComplete = () => {
    if (showAlert) {
      onAlertComplete();
    } else {
      setIntroComplete(true);
    }
  };

  return (
    <div className="App">
      {/* Écran d'intro ALERT - s'affiche au démarrage OU quand show_alert est déclenché */}
      {(!introComplete || showAlert) && (
        <AlertIntro onComplete={handleIntroComplete} />
      )}

      {/* Scène 3D avec la Terre et l'infection */}
      <Scene
        key={gameKey}
        startAnimation={introComplete && !showAlert}
        onInfectionComplete={handleInfectionComplete}
      />

      {/* Écran final - Planète infectée */}
      <InfectionComplete visible={infectionComplete} />
    </div>
  );
}

/**
 * App
 *
 * Composant principal de l'application
 * Intégré avec le système gamemaster pour le contrôle à distance
 *
 * Commands disponibles via backoffice:
 * - restart: Redémarrer le jeu
 * - reset_timer: Réinitialiser le timer (payload.value = secondes)
 * - set_timer: Définir le timer à une valeur spécifique
 * - show_alert: Afficher l'écran ALERT
 * - show_infected: Afficher l'écran "Planète Infectée"
 * - hide_infected: Masquer l'écran "Planète Infectée"
 */
function App() {
  return (
    <GameProvider>
      <GameContent />
      <DebugPanel />
    </GameProvider>
  );
}

export default App;
