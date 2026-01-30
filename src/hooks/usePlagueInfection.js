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
 */
export function usePlagueInfection(config = {}) {
  const {
    neighborSpreadThreshold = 1.0,    // 100% = propagation seulement quand completement infecte
    neighborSpreadInterval = 1500,    // ~1 pays par 1.5s = 200 pays en 5 min
    infectionSpeed = 0.0004,          // Vitesse de propagation dans un pays
    longDistanceInterval = 30000,     // Saut longue distance toutes les 30s
    longDistanceProbability = 0.15,   // 15% chance (rare)
    longDistanceMinDistance = 60,     // Distance min pour saut (degres)
    neighborDistance = 30,            // Distance max pour voisins (degres)
  } = config;

  const { geoData: contextGeoData } = useGeoJson();

  // Etat des pays infectes: { countryName: { centroid, progress, startTime, entryPoint } }
  const [infectedCountries, setInfectedCountries] = useState({});

  // Transmissions (arcs) - une seule par paire de pays
  const [transmissions, setTransmissions] = useState([]);

  // Set des paires deja connectees (pour eviter doublons)
  const connectedPairsRef = useRef(new Set());

  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({ infected: 0, total: 0 });

  // Donnees des pays
  const [countries, setCountries] = useState([]);
  const [neighbors, setNeighbors] = useState({});
  const [geoDataLoaded, setGeoDataLoaded] = useState(false);

  // Refs pour les timers
  const progressTimerRef = useRef(null);
  const neighborSpreadTimerRef = useRef(null);
  const longDistanceTimerRef = useRef(null);

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

      setInfectedCountries(prev => {
        const updated = { ...prev };
        let changed = false;

        Object.keys(updated).forEach(countryName => {
          const country = updated[countryName];
          if (country.progress < 1) {
            const elapsed = now - country.startTime;
            const newProgress = Math.min(1, elapsed * infectionSpeed);

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
    }, 100);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [isRunning, infectionSpeed]);

  // Fonction pour creer une cle unique pour une paire de pays
  const getPairKey = (country1, country2) => {
    return [country1, country2].sort().join('-');
  };

  // === PROPAGATION AUX VOISINS ===
  useEffect(() => {
    if (!isRunning || !geoDataLoaded) return;

    neighborSpreadTimerRef.current = setInterval(() => {
      setInfectedCountries(prev => {
        const updated = { ...prev };
        const now = Date.now();

        // Pays assez infectes pour propager (>= 60%)
        const readyToSpread = Object.keys(prev).filter(name => {
          return prev[name].progress >= neighborSpreadThreshold;
        });

        if (readyToSpread.length === 0) return prev;

        // Choisir UNE seule source aleatoire
        const sourceName = readyToSpread[Math.floor(Math.random() * readyToSpread.length)];
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

            // Ajouter la transmission
            setTransmissions(trans => [...trans, {
              id: pairKey,
              from: sourceName,
              to: target.name,
              isLongDistance: false,
            }]);

            setStats(s => ({ ...s, infected: Object.keys(updated).length }));
            return updated;
          }
        }

        return prev;
      });
    }, neighborSpreadInterval);

    return () => {
      if (neighborSpreadTimerRef.current) {
        clearInterval(neighborSpreadTimerRef.current);
      }
    };
  }, [isRunning, geoDataLoaded, neighbors, countries, neighborSpreadInterval, neighborSpreadThreshold]);

  // === SAUTS LONGUE DISTANCE ===
  useEffect(() => {
    if (!isRunning || !geoDataLoaded) return;

    longDistanceTimerRef.current = setInterval(() => {
      setInfectedCountries(prev => {
        const infectedNames = Object.keys(prev);
        if (infectedNames.length < 3) return prev;

        // Sources eligibles: pays completement infectes (100%)
        const sources = infectedNames.filter(
          name => prev[name].progress >= 1.0
        );

        if (sources.length === 0) return prev;
        if (Math.random() > longDistanceProbability) return prev;

        const updated = { ...prev };
        const now = Date.now();

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
  }, [isRunning, geoDataLoaded, countries, longDistanceInterval, longDistanceProbability, longDistanceMinDistance]);

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

  // Reset
  const reset = useCallback(() => {
    setInfectedCountries({});
    setTransmissions([]);
    connectedPairsRef.current.clear();
    setIsRunning(false);
    setStats(s => ({ ...s, infected: 0 }));
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (neighborSpreadTimerRef.current) clearInterval(neighborSpreadTimerRef.current);
    if (longDistanceTimerRef.current) clearInterval(longDistanceTimerRef.current);
  }, []);

  return {
    infectedCountries,
    transmissions,
    isRunning,
    stats,
    countries,
    geoDataLoaded,
    startInfection,
    reset,
    getCountryCentroid,
  };
}

export default usePlagueInfection;
