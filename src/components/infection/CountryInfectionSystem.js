import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CountryInfectionLayer } from './CountryInfectionLayer';
import { useCountryInfection } from '../../hooks/useCountryInfection';

/**
 * CountryInfectionSystem
 *
 * Полная система заражения по странам:
 * - Заражение в пределах границ стран
 * - Распространение на все страны
 * - Контролируемая скорость
 */
export function CountryInfectionSystem({
  autoStart = false,
  startCountry = 'France',
  spreadInterval = 2000,        // 2 секунды между заражениями
  infectionDuration = 3000,     // 3 секунды на заражение страны
  color = '#ff0000',
  rotationSpeed = 0.001,
  onStatsUpdate,
}) {
  const groupRef = useRef();

  const {
    infectedCountries,
    stats,
    geoDataLoaded,
    startInfection,
    isRunning,
  } = useCountryInfection({
    spreadInterval,
    infectionDuration,
    maxInfectedCountries: 200,
    neighborDistance: 30,
  });

  // Автозапуск
  useEffect(() => {
    if (autoStart && geoDataLoaded && !isRunning) {
      startInfection(startCountry);
    }
  }, [autoStart, geoDataLoaded, isRunning, startCountry, startInfection]);

  // Обновление статистики
  useEffect(() => {
    if (onStatsUpdate) {
      onStatsUpdate(stats);
    }
  }, [stats, onStatsUpdate]);

  // Ротация
  useFrame(() => {
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      <CountryInfectionLayer
        infectedCountries={infectedCountries}
        color={color}
        rotationSpeed={0}
      />
    </group>
  );
}

export default CountryInfectionSystem;
