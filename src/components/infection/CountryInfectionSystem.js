import { useEffect, useRef } from 'react';
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
 */
export function CountryInfectionSystem({
  autoStart = false,
  startCountry = 'France',
  color = '#ff0000',
  arcColor = '#ff3333',
  rotationSpeed = 0.001,
  totalInfectionTime = 300000,  // 5 minutes par defaut (en ms)
  onStatsUpdate,
}) {
  const groupRef = useRef();

  const {
    infectedCountries,
    transmissions,
    stats,
    geoDataLoaded,
    startInfection,
    isRunning,
    getCountryCentroid,
  } = usePlagueInfection({
    totalInfectionTime,
    neighborSpreadInterval: 800,
    neighborSpreadThreshold: 0.5,
    maxSpreadPerInterval: 3,
    longDistanceInterval: 12000,
    longDistanceProbability: 0.4,
  });

  // Autostart
  useEffect(() => {
    if (autoStart && geoDataLoaded && !isRunning) {
      startInfection(startCountry);
    }
  }, [autoStart, geoDataLoaded, isRunning, startCountry, startInfection]);

  // Stats update
  useEffect(() => {
    if (onStatsUpdate) {
      onStatsUpdate(stats);
    }
  }, [stats, onStatsUpdate]);

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
      />
    </group>
  );
}

export default CountryInfectionSystem;
