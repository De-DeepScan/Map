import { useState, useCallback, useRef, useEffect } from 'react';
import { extractCountryData, findNeighbors } from '../utils/countryUtils';
import { useGeoJson } from '../context/GeoJsonContext';
                                                                                                                                                                                                                                                                        
/**
 * Hook useCountryInfection
 *
 * Управляет заражением по странам:
 * - Загружает GeoJSON данные
 * - Вычисляет соседей
 * - Распространяет заражение от страны к стране
 */
export function useCountryInfection(config = {}) {
  const {
    geoJsonUrl = '/world.geojson',
    spreadInterval = 2000,      // Интервал распространения (мс)
    infectionDuration = 3000,   // Время полного заражения страны (мс)
    maxInfectedCountries = 200,
    neighborDistance = 30,
  } = config;

  const { geoData: contextGeoData } = useGeoJson();

  // Состояние заражённых стран: { countryName: { progress: 0-1, startTime, fullyInfected } }
  const [infectedCountries, setInfectedCountries] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({ infected: 0, total: 0 });

  // Данные о странах
  const [countries, setCountries] = useState([]);
  const [neighbors, setNeighbors] = useState({});
  const [geoDataLoaded, setGeoDataLoaded] = useState(false);

  const spreadTimerRef = useRef(null);
  const progressTimerRef = useRef(null);

  // Загрузка GeoJSON из Context
  useEffect(() => {
    if (!contextGeoData) return;

    const countryData = extractCountryData(contextGeoData);
    const neighborData = findNeighbors(countryData, neighborDistance);

    setCountries(countryData);
    setNeighbors(neighborData);
    setStats(prev => ({ ...prev, total: countryData.length }));
    setGeoDataLoaded(true);
  }, [contextGeoData, neighborDistance]);

  // Обновление прогресса заражения - OPTIMISÉ pour éviter les plantages
  useEffect(() => {
    if (!isRunning) return;

    progressTimerRef.current = setInterval(() => {
      const now = Date.now();

      setInfectedCountries(prev => {
        // Filtrer seulement les pays pas encore à 100% (OPTIMISATION CRITIQUE)
        const inProgressCountries = Object.keys(prev).filter(
          name => !prev[name].fullyInfected
        );

        // Si tous les pays sont à 100%, pas besoin de recalculer!
        if (inProgressCountries.length === 0) return prev;

        const updated = { ...prev };
        let changed = false;

        // Traiter UNIQUEMENT les pays en cours d'infection (pas tous les 200!)
        inProgressCountries.forEach(countryName => {
          const infection = updated[countryName];
          const elapsed = now - infection.startTime;
          const newProgress = Math.min(1, elapsed / infectionDuration);

          if (newProgress !== infection.progress) {
            updated[countryName] = {
              ...infection,
              progress: newProgress,
              fullyInfected: newProgress >= 1,
            };
            changed = true;
          }
        });

        return changed ? updated : prev;
      });
    }, 500);  // Réduit de 100ms à 500ms (80% moins d'updates!)

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [isRunning, infectionDuration]);

  // Распространение на соседей (несколько стран за раз для быстрого заражения)
  useEffect(() => {
    if (!isRunning || !geoDataLoaded) return;

    spreadTimerRef.current = setInterval(() => {
      setInfectedCountries(prev => {
        const infectedCount = Object.keys(prev).length;
        if (infectedCount >= maxInfectedCountries) return prev;

        // Найти полностью заражённые страны
        const fullyInfected = Object.keys(prev).filter(
          name => prev[name].fullyInfected
        );

        if (fullyInfected.length === 0) return prev;

        let updated = { ...prev };
        const now = Date.now();

        // Заразить от нескольких источников (чем больше заражено - тем быстрее распространяется)
        const spreadCount = Math.min(3, Math.ceil(fullyInfected.length / 10) + 1);

        for (let i = 0; i < spreadCount; i++) {
          // Выбрать случайную страну-источник
          const sourceCountry = fullyInfected[Math.floor(Math.random() * fullyInfected.length)];
          const sourceNeighbors = neighbors[sourceCountry] || [];

          // Найти незаражённого соседа
          const uninfectedNeighbors = sourceNeighbors.filter(n => !updated[n.name]);

          if (uninfectedNeighbors.length > 0) {
            // Заразить случайного соседа
            const randomIndex = Math.floor(Math.random() * uninfectedNeighbors.length);
            const targetNeighbor = uninfectedNeighbors[randomIndex];

            updated = {
              ...updated,
              [targetNeighbor.name]: {
                progress: 0,
                startTime: now,
                fullyInfected: false,
              },
            };
          }
        }

        if (Object.keys(updated).length > Object.keys(prev).length) {
          setStats(s => ({ ...s, infected: Object.keys(updated).length }));
          return updated;
        }
        return prev;
      });
    }, spreadInterval);

    return () => {
      if (spreadTimerRef.current) {
        clearInterval(spreadTimerRef.current);
      }
    };
  }, [isRunning, geoDataLoaded, neighbors, spreadInterval, maxInfectedCountries]);

  // Начать заражение в стране
  const startInfection = useCallback((countryName) => {
    if (!geoDataLoaded) return;

    // Найти страну
    let country = countries.find(c =>
      c.name.toLowerCase() === countryName.toLowerCase()
    );

    if (!country) {
      // Попробовать найти похожую
      country = countries.find(c =>
        c.name.toLowerCase().includes(countryName.toLowerCase())
      );
    }

    if (!country && countries.length > 0) {
      country = countries[Math.floor(Math.random() * countries.length)];
    }

    if (country) {
      setInfectedCountries({
        [country.name]: {
          progress: 0,
          startTime: Date.now(),
          fullyInfected: false,
        },
      });
      setStats(s => ({ ...s, infected: 1 }));
      setIsRunning(true);
    }
  }, [countries, geoDataLoaded]);

  // Получить центроид страны
  const getCountryCentroid = useCallback((countryName) => {
    const country = countries.find(c => c.name === countryName);
    return country?.centroid || null;
  }, [countries]);

  // Сброс
  const reset = useCallback(() => {
    setInfectedCountries({});
    setIsRunning(false);
    setStats(s => ({ ...s, infected: 0 }));
    if (spreadTimerRef.current) clearInterval(spreadTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
  }, []);

  return {
    infectedCountries,
    isRunning,
    stats,
    countries,
    geoDataLoaded,
    startInfection,
    reset,
    getCountryCentroid,
  };
}

export default useCountryInfection;
