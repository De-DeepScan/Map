import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const BACKOFFICE_URL = "http://192.168.10.1:3000"; // IP du Mac Mini

/**
 * useGamemaster
 *
 * Hook pour la communication avec le système de contrôle (backoffice)
 * Permet de recevoir des commandes et d'envoyer l'état du jeu
 *
 * @param {Object} config - Configuration du jeu
 * @param {string} config.gameId - Identifiant unique du jeu
 * @param {string} config.name - Nom affiché du jeu
 * @param {Array} config.actions - Actions disponibles [{id, label, params?}]
 * @param {Function} config.onCommand - Callback pour les commandes reçues
 */
export function useGamemaster(config) {
  const socketRef = useRef(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const socket = io(BACKOFFICE_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    const register = () => {
      console.log("[Gamemaster] Registering game:", configRef.current.gameId);
      socket.emit("register", {
        gameId: configRef.current.gameId,
        name: configRef.current.name,
        availableActions: configRef.current.actions,
      });
    };

    socket.on("connect", () => {
      console.log("[Gamemaster] Connected to backoffice");
      register();
    });

    socket.on("disconnect", () => {
      console.log("[Gamemaster] Disconnected from backoffice");
    });

    socket.on("command", ({ action, payload }) => {
      console.log("[Gamemaster] Command received:", action, payload);
      configRef.current.onCommand(action, payload ?? {});
    });

    socket.on("connect_error", (error) => {
      console.log("[Gamemaster] Connection error:", error.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Envoyer une mise à jour d'état au backoffice
  const updateState = useCallback((state) => {
    socketRef.current?.emit("state_update", { state });
  }, []);

  // Envoyer un événement au backoffice
  const sendEvent = useCallback((name, data) => {
    console.log("[Gamemaster] Sending event:", name, data);
    socketRef.current?.emit("event", { name, data });
  }, []);

  // Vérifier si connecté
  const isConnected = useCallback(() => {
    return socketRef.current?.connected ?? false;
  }, []);

  return { updateState, sendEvent, isConnected };
}

export default useGamemaster;
