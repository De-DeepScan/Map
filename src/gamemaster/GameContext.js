import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useGamemaster } from './useGamemaster';

const GameContext = createContext(null);

const DEFAULT_TOTAL_TIME = 5 * 60 * 1000; // 5 minutes par défaut

/**
 * GameProvider
 *
 * Contexte centralisé pour la gestion de l'état du jeu
 * Intégré avec le système gamemaster pour le contrôle à distance
 *
 * Actions disponibles via backoffice:
 * - restart: Redémarrer le jeu (comme npm run dev)
 * - reset_timer: Réinitialiser le timer (payload.value = secondes)
 * - set_timer: Définir une valeur spécifique pour le timer
 * - show_alert: Afficher l'écran ALERT
 * - show_infected: Afficher l'écran "Planète Infectée"
 * - hide_infected: Masquer l'écran "Planète Infectée"
 */
export function GameProvider({ children }) {
  // === GAME STATE ===
  const [introComplete, setIntroComplete] = useState(false);
  const [infectionComplete, setInfectionComplete] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [totalTime, setTotalTime] = useState(DEFAULT_TOTAL_TIME);
  const [remainingTime, setRemainingTime] = useState(DEFAULT_TOTAL_TIME);
  const [gameKey, setGameKey] = useState(0); // Pour forcer le re-render complet

  // Ref pour éviter les problèmes de closure
  const stateRef = useRef({
    introComplete,
    infectionComplete,
    startTime,
    totalTime,
    remainingTime,
  });

  // Mettre à jour la ref quand l'état change
  useEffect(() => {
    stateRef.current = {
      introComplete,
      infectionComplete,
      startTime,
      totalTime,
      remainingTime,
    };
  }, [introComplete, infectionComplete, startTime, totalTime, remainingTime]);

  // === ACTIONS ===

  // Redémarrer le jeu (restart)
  const restartGame = useCallback(() => {
    console.log("[Game] Restarting game...");
    setIntroComplete(false);
    setInfectionComplete(false);
    setShowAlert(false);
    setStartTime(null);
    setTotalTime(DEFAULT_TOTAL_TIME);
    setRemainingTime(DEFAULT_TOTAL_TIME);
    setGameKey(k => k + 1); // Force complete re-render
  }, []);

  // Réinitialiser le timer avec une valeur optionnelle
  const resetTimer = useCallback((seconds = null) => {
    const newTime = seconds ? seconds * 1000 : DEFAULT_TOTAL_TIME;
    console.log("[Game] Resetting timer to:", newTime / 1000, "seconds");
    setTotalTime(newTime);
    setRemainingTime(newTime);
    setStartTime(Date.now());
  }, []);

  // Définir une valeur spécifique pour le temps restant
  const setTimer = useCallback((seconds) => {
    console.log("[Game] Setting timer to:", seconds, "seconds");
    setRemainingTime(seconds * 1000);
    // Recalculer startTime pour que le timer affiche la bonne valeur
    setStartTime(Date.now() - (totalTime - seconds * 1000));
  }, [totalTime]);

  // Afficher l'écran ALERT
  const triggerAlert = useCallback(() => {
    console.log("[Game] Triggering ALERT screen");
    setShowAlert(true);
    setIntroComplete(false);
  }, []);

  // Masquer l'écran ALERT (appelé après l'animation)
  const onAlertComplete = useCallback(() => {
    console.log("[Game] Alert complete");
    setShowAlert(false);
    setIntroComplete(true);
    if (!startTime) {
      setStartTime(Date.now());
    }
  }, [startTime]);

  // Afficher l'écran "Planète Infectée"
  const showInfected = useCallback(() => {
    console.log("[Game] Showing infected screen");
    setInfectionComplete(true);
  }, []);

  // Masquer l'écran "Planète Infectée"
  const hideInfected = useCallback(() => {
    console.log("[Game] Hiding infected screen");
    setInfectionComplete(false);
  }, []);

  // Callback pour la fin de l'infection (depuis Scene)
  const handleInfectionComplete = useCallback(() => {
    console.log("[Game] Infection complete triggered");
    setInfectionComplete(true);
  }, []);

  // === GAMEMASTER INTEGRATION ===

  const { updateState, sendEvent, isConnected } = useGamemaster({
    gameId: "planet-infection",
    name: "Planet Infection - DeepScan",
    actions: [
      { id: "restart", label: "Redémarrer le jeu" },
      { id: "reset_timer", label: "Reset timer", params: ["value (seconds)"] },
      { id: "set_timer", label: "Définir timer", params: ["value (seconds)"] },
      { id: "show_alert", label: "Afficher ALERT" },
      { id: "show_infected", label: "Afficher Planète Infectée" },
      { id: "hide_infected", label: "Masquer Planète Infectée" },
    ],
    onCommand: (action, payload) => {
      console.log("[Game] Received command:", action, payload);

      switch (action) {
        case "restart":
          restartGame();
          break;

        case "reset_timer":
          resetTimer(payload.value);
          break;

        case "set_timer":
          setTimer(payload.value);
          break;

        case "show_alert":
          triggerAlert();
          break;

        case "show_infected":
          showInfected();
          break;

        case "hide_infected":
          hideInfected();
          break;

        default:
          console.warn("[Game] Unknown command:", action);
      }
    },
  });

  // === TIMER LOGIC ===

  useEffect(() => {
    if (!startTime || infectionComplete) return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, totalTime - elapsed);
      setRemainingTime(remaining);

      if (remaining <= 0) {
        setInfectionComplete(true);
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [startTime, totalTime, infectionComplete]);

  // === STATE SYNC TO BACKOFFICE ===

  useEffect(() => {
    updateState({
      introComplete,
      infectionComplete,
      showAlert,
      remainingTime: Math.ceil(remainingTime / 1000),
      totalTime: totalTime / 1000,
      gameKey,
    });
  }, [introComplete, infectionComplete, showAlert, remainingTime, totalTime, gameKey, updateState]);

  // === CONTEXT VALUE ===

  const value = {
    // State
    introComplete,
    infectionComplete,
    showAlert,
    startTime,
    totalTime,
    remainingTime,
    gameKey,

    // Actions
    restartGame,
    resetTimer,
    setTimer,
    triggerAlert,
    onAlertComplete,
    showInfected,
    hideInfected,
    handleInfectionComplete,
    setIntroComplete,

    // Gamemaster
    sendEvent,
    isConnected,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

/**
 * useGame
 *
 * Hook pour accéder au contexte du jeu
 */
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export default GameContext;
