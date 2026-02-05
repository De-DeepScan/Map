import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CountryInfectionLayer } from './CountryInfectionLayer';
import { TransmissionArcsManager } from './TransmissionArcsManager';
import { usePlagueInfection } from '../../hooks/usePlagueInfection';

/**
 * CountryInfectionSystem
 *
 * Systeme d'infection style Plague Inc.:
 * - Arcs de transmission (une seule ligne par paire de pays)
 * - Infection qui se propage depuis le point d'arrivee
 * - Duree totale configurable (defaut: 5 minutes)
 * - Mode regression (victoire joueurs): l'infection se retire
 */
export const CountryInfectionSystem = forwardRef(function CountryInfectionSystem({
  autoStart = false,
  startCountry = 'France',
  color = '#ff0000',
  arcColor = '#ff3333',
  rotationSpeed = 0.001,
  totalInfectionTime = 900000,  // 15 minutes par defaut (en ms)
  onStatsUpdate,
  onRegressionComplete,
  triggerRegression = false,
}, ref) {
  const groupRef = useRef();

  // Calculer les paramètres pour que l'infection prenne exactement totalInfectionTime
  // Avec 200 pays et 15 minutes (900s), on a ~4.5s par pays en moyenne
  // Mais avec l'accélération progressive, on commence lentement
  const {
    infectedCountries,
    transmissions,
    stats,
    geoDataLoaded,
    startInfection,
    startRegression,
    reset,
    isRunning,
    isRegressing,
    regressionComplete,
    getCountryCentroid,
  } = usePlagueInfection({
    totalInfectionTime,
    neighborSpreadInterval: 3500,      // 3.5 secondes entre les vagues (était 800ms)
    neighborSpreadThreshold: 0.4,      // Propagation quand 40% infecté
    maxSpreadPerInterval: 2,           // Max 2 pays par vague (était 3)
    longDistanceInterval: 25000,       // Saut longue distance toutes les 25s (était 12s)
    longDistanceProbability: 0.3,      // 30% de chance (était 40%)
  });

  // Exposer les méthodes via ref
  useImperativeHandle(ref, () => ({
    startRegression: () => startRegression(),
    isRegressing: isRegressing,
    canStartRegression: () => {
      const infectedCount = Object.keys(infectedCountries).length;
      return infectedCount > 0 && infectedCount < stats.total;
    },
  }), [startRegression, isRegressing, infectedCountries, stats.total]);

  // Ref pour suivre l'état précédent de autoStart
  const prevAutoStartRef = useRef(autoStart);

  // Autostart et Reset
  useEffect(() => {
    // Détecter le passage de autoStart de true à false (= reset demandé)
    if (prevAutoStartRef.current && !autoStart) {
      reset();
    }
    prevAutoStartRef.current = autoStart;
  }, [autoStart, reset]);

  // Démarrer l'infection quand autoStart devient true
  useEffect(() => {
    if (autoStart && geoDataLoaded && !isRunning && !isRegressing) {
      startInfection(startCountry);
    }
  }, [autoStart, geoDataLoaded, isRunning, isRegressing, startCountry, startInfection]);

  // Trigger regression from parent
  useEffect(() => {
    if (triggerRegression && !isRegressing) {
      startRegression();
    }
  }, [triggerRegression, isRegressing, startRegression]);

  // Stats update
  useEffect(() => {
    if (onStatsUpdate) {
      onStatsUpdate(stats);
    }
  }, [stats, onStatsUpdate]);

  // Regression complete callback
  useEffect(() => {
    if (regressionComplete && onRegressionComplete) {
      onRegressionComplete();
    }
  }, [regressionComplete, onRegressionComplete]);

  // Rotation
  useFrame(() => {
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Couche d'infection des pays (propagation depuis point d'entree) */}
      <CountryInfectionLayer
        infectedCountries={infectedCountries}
        color={color}
        rotationSpeed={0}
      />

      {/* Arcs de transmission (une seule ligne par paire) */}
      <TransmissionArcsManager
        activeTransmissions={transmissions}
        getCountryCentroid={getCountryCentroid}
        color={arcColor}
        longDistanceColor="#ff6644"
        fadeOut={isRegressing}
      />
    </group>
  );
});

export default CountryInfectionSystem;
