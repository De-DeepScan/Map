import { useState, useCallback, useRef, useEffect } from 'react';
import { extractCountryData, findNeighbors } from '../utils/countryUtils';
import { geoDistance } from '../utils/geoUtils';
import { useGeoJson } from '../context/GeoJsonContext';

/**
 * Hook usePlagueInfection
 *
 * Logique d'infection style Plague Inc.:
 * - Propagation aux voisins avec une seule ligne par paire
 * - Sauts longue distance (style avion)
 * - Point d'entree pour chaque pays (pour propagation depuis ce point)
 * - Calibre pour infecter toute la planete dans le temps defini
 */
export function usePlagueInfection(config = {}) {
  const {
    totalInfectionTime = 900000,      // Temps total pour infecter la planete (15 min par defaut)
    neighborSpreadThreshold = 0.5,    // 50% = propagation quand a moitie infecte
    neighborSpreadInterval = 800,     // Intervalle de check pour propagation
    maxSpreadPerInterval = 3,         // Nombre max de pays infectes par intervalle
    longDistanceInterval = 12000,     // Saut longue distance toutes les 12s
    longDistanceProbability = 0.4,    // 40% chance
    longDistanceMinDistance = 50,     // Distance min pour saut (degres)
    neighborDistance = 30,            // Distance max pour voisins (degres)
  } = config;

  // Calcul dynamique de la vitesse d'infection
  // Pour 15 minutes (900s), on veut que chaque pays prenne environ 10-15s pour se remplir
  // L'accélération progressive gère le rythme global
  const timePerGeneration = totalInfectionTime / 6;  // Plus lent pour 15 min
  const infectionSpeed = 1.0 / (timePerGeneration - 3000); // progress/ms

  const { geoData: contextGeoData } = useGeoJson();

  // Etat des pays infectes: { countryName: { centroid, progress, startTime, entryPoint } }
  const [infectedCountries, setInfectedCountries] = useState({});

  // Transmissions (arcs) - une seule par paire de pays
  const [transmissions, setTransmissions] = useState([]);

  // Set des paires deja connectees (pour eviter doublons)
  const connectedPairsRef = useRef(new Set());

  const [isRunning, setIsRunning] = useState(false);
  const [isRegressing, setIsRegressing] = useState(false);
  const [regressionComplete, setRegressionComplete] = useState(false);
  const [stats, setStats] = useState({ infected: 0, total: 0 });

  // Donnees des pays
  const [countries, setCountries] = useState([]);
  const [neighbors, setNeighbors] = useState({});
  const [geoDataLoaded, setGeoDataLoaded] = useState(false);

  // Refs pour les timers
  const progressTimerRef = useRef(null);
  const neighborSpreadTimerRef = useRef(null);
  const longDistanceTimerRef = useRef(null);
  const infectionStartTimeRef = useRef(null);
  const regressionStartTimeRef = useRef(null);

  // Chargement GeoJSON
  useEffect(() => {
    if (!contextGeoData) return;

    const countryData = extractCountryData(contextGeoData);
    const neighborData = findNeighbors(countryData, neighborDistance);

    setCountries(countryData);
    setNeighbors(neighborData);
    setStats(prev => ({ ...prev, total: countryData.length }));
    setGeoDataLoaded(true);
  }, [contextGeoData, neighborDistance]);

  // === PROGRESSION DE L'INFECTION DANS CHAQUE PAYS ===
  useEffect(() => {
    if (!isRunning) return;

    progressTimerRef.current = setInterval(() => {
      const now = Date.now();

      // Calculer le multiplicateur de vitesse base sur le temps global
      const globalElapsed = infectionStartTimeRef.current ? now - infectionStartTimeRef.current : 0;
      const timeRatio = Math.min(1, globalElapsed / totalInfectionTime);
      // Commence a 0.7x, finit a 1.5x (acceleration douce pour 15 min)
      const speedMultiplier = 0.7 + Math.pow(timeRatio, 2) * 0.8;

      setInfectedCountries(prev => {
        const updated = { ...prev };
        let changed = false;

        Object.keys(updated).forEach(countryName => {
          const country = updated[countryName];
          if (country.progress < 1) {
            const elapsed = now - country.startTime;
            // Ne pas commencer avant que le trait arrive (elapsed < 0)
            if (elapsed < 0) return;

            const newProgress = Math.min(1, elapsed * infectionSpeed * speedMultiplier);

            if (newProgress !== country.progress) {
              updated[countryName] = {
                ...country,
                progress: newProgress,
              };
              changed = true;
            }
          }
        });

        return changed ? updated : prev;
      });
    }, 250); // Optimisé: 100ms -> 250ms pour réduire la charge CPU

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [isRunning, infectionSpeed, totalInfectionTime]);

  // === REGRESSION DE L'INFECTION (VICTOIRE JOUEURS) ===
  useEffect(() => {
    if (!isRegressing) return;

    // Vitesse de regression: on veut que ca prenne environ 20 secondes pour tout effacer
    const regressionDuration = 20000;
    const regressionSpeed = 1.0 / regressionDuration;

    progressTimerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = regressionStartTimeRef.current ? now - regressionStartTimeRef.current : 0;

      setInfectedCountries(prev => {
        const updated = { ...prev };
        let changed = false;

        // Trier les pays par ordre inverse d'infection (derniers infectés disparaissent en premier)
        const sortedCountries = Object.keys(prev).sort((a, b) => {
          return (prev[b].startTime || 0) - (prev[a].startTime || 0);
        });

        sortedCountries.forEach((countryName, index) => {
          const country = prev[countryName];
          // Délai progressif: les derniers pays infectés disparaissent en premier
          const countryDelay = index * 30; // 30ms entre chaque pays
          const countryElapsed = Math.max(0, elapsed - countryDelay);

          // Calculer la nouvelle progression (diminue)
          const regressAmount = countryElapsed * regressionSpeed;
          const newProgress = Math.max(0, country.progress - regressAmount);

          if (newProgress <= 0) {
            // Pays guéri - le supprimer
            delete updated[countryName];
            changed = true;
          } else if (newProgress !== country.progress) {
            updated[countryName] = {
              ...country,
              progress: newProgress,
            };
            changed = true;
          }
        });

        // Mettre à jour les stats
        if (changed) {
          setStats(s => ({ ...s, infected: Object.keys(updated).length }));
        }

        // Vérifier si la régression est terminée
        if (Object.keys(updated).length === 0) {
          setIsRegressing(false);
          setRegressionComplete(true);
          setTransmissions([]);
          connectedPairsRef.current.clear();
        }

        return changed ? updated : prev;
      });
    }, 50); // Plus rapide pour une animation fluide

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [isRegressing]);

  // Fonction pour creer une cle unique pour une paire de pays
  const getPairKey = (country1, country2) => {
    return [country1, country2].sort().join('-');
  };

  // === PROPAGATION AUX VOISINS (MULTIPLE SIMULTANÉE) ===
  useEffect(() => {
    if (!isRunning || !geoDataLoaded) return;

    neighborSpreadTimerRef.current = setInterval(() => {
      setInfectedCountries(prev => {
        const updated = { ...prev };
        const now = Date.now();
        const newTransmissions = [];
        let spreadCount = 0;

        const totalCountries = countries.length;
        const infectedCount = Object.keys(prev).length;
        const remainingCountries = totalCountries - infectedCount;

        if (remainingCountries <= 0) return prev;

        // Temps ecoule (ratio 0 -> 1)
        const elapsedTime = infectionStartTimeRef.current ? now - infectionStartTimeRef.current : 0;
        const timeRatio = Math.min(1, elapsedTime / totalInfectionTime);

        // Acceleration progressive douce pour 15 min: commence a 1, finit a maxSpreadPerInterval
        // Courbe cubique: très lent au début, accélère vers la fin
        const accelerationCurve = Math.pow(timeRatio, 3); // Courbe cubique (plus douce)
        const dynamicMaxSpread = Math.max(1, Math.floor(1 + accelerationCurve * (maxSpreadPerInterval - 1)));

        // Pays assez infectes pour propager
        const readyToSpread = Object.keys(prev).filter(name => {
          return prev[name].progress >= neighborSpreadThreshold;
        });

        if (readyToSpread.length === 0) return prev;

        // Melanger les sources pour variete
        const shuffledSources = [...readyToSpread].sort(() => Math.random() - 0.5);

        // Chaque source peut propager a UN voisin (jusqu'a dynamicMaxSpread au total)
        for (const sourceName of shuffledSources) {
          if (spreadCount >= dynamicMaxSpread) break;

          const sourceNeighbors = neighbors[sourceName] || [];
          const sourceCountry = countries.find(c => c.name === sourceName);

          // Filtrer les voisins non infectes ET sans ligne existante
          const uninfected = sourceNeighbors.filter(n => {
            if (updated[n.name]) return false;
            const pairKey = getPairKey(sourceName, n.name);
            return !connectedPairsRef.current.has(pairKey);
          });

          if (uninfected.length > 0 && sourceCountry) {
            const randomIdx = Math.floor(Math.random() * uninfected.length);
            const target = uninfected[randomIdx];
            const targetCountry = countries.find(c => c.name === target.name);

            if (targetCountry) {
              // Marquer la paire comme connectee
              const pairKey = getPairKey(sourceName, target.name);
              connectedPairsRef.current.add(pairKey);

              // Point d'entree = centroid du pays cible (la ou le trait arrive)
              // Delai = duree du trait (2.5s pour voisins)
              updated[target.name] = {
                centroid: targetCountry.centroid,
                progress: 0,
                startTime: now + 2500,
                entryPoint: targetCountry.centroid,
              };

              newTransmissions.push({
                id: pairKey,
                from: sourceName,
                to: target.name,
                isLongDistance: false,
              });

              spreadCount++;
            }
          }
        }

        if (newTransmissions.length > 0) {
          setTransmissions(trans => [...trans, ...newTransmissions]);
          setStats(s => ({ ...s, infected: Object.keys(updated).length }));
          return updated;
        }

        return prev;
      });
    }, neighborSpreadInterval);

    return () => {
      if (neighborSpreadTimerRef.current) {
        clearInterval(neighborSpreadTimerRef.current);
      }
    };
  }, [isRunning, geoDataLoaded, neighbors, countries, neighborSpreadInterval, neighborSpreadThreshold, maxSpreadPerInterval, totalInfectionTime]);

  // === SAUTS LONGUE DISTANCE ===
  useEffect(() => {
    if (!isRunning || !geoDataLoaded) return;

    longDistanceTimerRef.current = setInterval(() => {
      setInfectedCountries(prev => {
        const infectedNames = Object.keys(prev);
        if (infectedNames.length < 2) return prev;

        const now = Date.now();
        const totalCountries = countries.length;
        const infectedCount = infectedNames.length;
        const remainingCountries = totalCountries - infectedCount;

        if (remainingCountries <= 0) return prev;

        // Acceleration progressive basee sur le temps ecoule (plus douce pour 15 min)
        const elapsedTime = infectionStartTimeRef.current ? now - infectionStartTimeRef.current : 0;
        const timeRatio = Math.min(1, elapsedTime / totalInfectionTime);

        // Probabilite augmente avec le temps (commence très faible, accélère vers la fin)
        const accelerationCurve = Math.pow(timeRatio, 2.5);  // Courbe plus douce
        const effectiveProbability = longDistanceProbability * 0.2 + accelerationCurve * longDistanceProbability * 1.2;

        // Seuil de progression diminue avec le temps (plus facile de propager vers la fin)
        const minProgress = 0.85 - (accelerationCurve * 0.35); // 0.85 -> 0.5
        const sources = infectedNames.filter(
          name => prev[name].progress >= minProgress
        );

        if (sources.length === 0) return prev;
        if (Math.random() > effectiveProbability) return prev;

        const updated = { ...prev };

        const sourceName = sources[Math.floor(Math.random() * sources.length)];
        const sourceCountry = countries.find(c => c.name === sourceName);

        if (sourceCountry) {
          const uninfectedFar = countries.filter(c => {
            if (updated[c.name]) return false;
            const pairKey = getPairKey(sourceName, c.name);
            if (connectedPairsRef.current.has(pairKey)) return false;

            const dist = geoDistance(
              sourceCountry.centroid.lat, sourceCountry.centroid.lon,
              c.centroid.lat, c.centroid.lon
            );
            return dist > longDistanceMinDistance;
          });

          if (uninfectedFar.length > 0) {
            const target = uninfectedFar[Math.floor(Math.random() * uninfectedFar.length)];

            const pairKey = getPairKey(sourceName, target.name);
            connectedPairsRef.current.add(pairKey);

            // Point d'entree = centroid du pays cible (la ou le trait arrive)
            // Delai = duree du trait (4s pour longue distance)
            updated[target.name] = {
              centroid: target.centroid,
              progress: 0,
              startTime: now + 4000,
              entryPoint: target.centroid,
            };

            setTransmissions(trans => [...trans, {
              id: pairKey,
              from: sourceName,
              to: target.name,
              isLongDistance: true,
            }]);

            setStats(s => ({ ...s, infected: Object.keys(updated).length }));
            return updated;
          }
        }

        return prev;
      });
    }, longDistanceInterval);

    return () => {
      if (longDistanceTimerRef.current) {
        clearInterval(longDistanceTimerRef.current);
      }
    };
  }, [isRunning, geoDataLoaded, countries, longDistanceInterval, longDistanceProbability, longDistanceMinDistance, totalInfectionTime]);

  // Demarrer l'infection
  const startInfection = useCallback((countryName) => {
    if (!geoDataLoaded) return;

    let country = countries.find(c =>
      c.name.toLowerCase() === countryName.toLowerCase()
    );

    if (!country) {
      country = countries.find(c =>
        c.name.toLowerCase().includes(countryName.toLowerCase())
      );
    }

    if (!country && countries.length > 0) {
      country = countries[Math.floor(Math.random() * countries.length)];
    }

    if (country) {
      connectedPairsRef.current.clear();
      infectionStartTimeRef.current = Date.now();

      setInfectedCountries({
        [country.name]: {
          centroid: country.centroid,
          progress: 0,
          startTime: Date.now(),
          entryPoint: country.centroid, // Premier pays: entree = centroid
        },
      });
      setTransmissions([]);
      setStats(s => ({ ...s, infected: 1 }));
      setIsRunning(true);
    }
  }, [countries, geoDataLoaded]);

  // Obtenir le centroid d'un pays
  const getCountryCentroid = useCallback((countryName) => {
    const country = countries.find(c => c.name === countryName);
    return country?.centroid || null;
  }, [countries]);

  // Démarrer la régression (victoire des joueurs)
  const startRegression = useCallback(() => {
    // Ne pas permettre la regression à 100% ou si pas d'infection
    const infectedCount = Object.keys(infectedCountries).length;
    if (infectedCount === 0 || infectedCount >= countries.length) {
      console.log('[Infection] Cannot start regression: no infection or 100% infected');
      return false;
    }

    // Arrêter la propagation
    setIsRunning(false);
    if (neighborSpreadTimerRef.current) clearInterval(neighborSpreadTimerRef.current);
    if (longDistanceTimerRef.current) clearInterval(longDistanceTimerRef.current);

    // Démarrer la régression
    regressionStartTimeRef.current = Date.now();
    setRegressionComplete(false);
    setIsRegressing(true);

    console.log('[Infection] Starting regression - player victory!');
    return true;
  }, [infectedCountries, countries.length]);

  // Reset
  const reset = useCallback(() => {
    setInfectedCountries({});
    setTransmissions([]);
    connectedPairsRef.current.clear();
    setIsRunning(false);
    setIsRegressing(false);
    setRegressionComplete(false);
    setStats(s => ({ ...s, infected: 0 }));
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (neighborSpreadTimerRef.current) clearInterval(neighborSpreadTimerRef.current);
    if (longDistanceTimerRef.current) clearInterval(longDistanceTimerRef.current);
  }, []);

  return {
    infectedCountries,
    transmissions,
    isRunning,
    isRegressing,
    regressionComplete,
    stats,
    countries,
    geoDataLoaded,
    startInfection,
    startRegression,
    reset,
    getCountryCentroid,
  };
}

export default usePlagueInfection;
