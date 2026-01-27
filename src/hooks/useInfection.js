import { useState, useCallback, useRef } from 'react';
import { MAJOR_CITIES, geoDistance } from '../utils/geoUtils';

/**
 * Hook useInfection
 *
 * Gère l'état global de l'infection :
 * - Clusters actifs
 * - Routes de transmission
 * - Logique de propagation intercontinentale
 */
export function useInfection(config = {}) {
  const {
    spreadSpeed = 2,
    routeInterval = 5,     // Intervalle entre les routes en secondes
    maxClusters = 10,
    maxRoutes = 15,
  } = config;

  const [clusters, setClusters] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({ infected: 0, routes: 0 });

  const clusterIdCounter = useRef(0);
  const routeIdCounter = useRef(0);
  const infectedCities = useRef(new Set());

  // Démarrer l'infection à un point donné
  const startInfection = useCallback((lat, lon, name = 'Patient Zero') => {
    const id = `cluster-${clusterIdCounter.current++}`;

    setClusters([{
      id,
      lat,
      lon,
      name,
      startTime: Date.now(),
    }]);

    infectedCities.current.add(name);
    setIsRunning(true);
    setStats({ infected: 1, routes: 0 });
  }, []);

  // Démarrer depuis une ville aléatoire
  const startRandomInfection = useCallback(() => {
    const city = MAJOR_CITIES[Math.floor(Math.random() * MAJOR_CITIES.length)];
    startInfection(city.lat, city.lon, city.name);
  }, [startInfection]);

  // Ajouter un nouveau cluster (foyer secondaire)
  const addCluster = useCallback((lat, lon, name = 'Unknown') => {
    if (clusters.length >= maxClusters) return;

    const id = `cluster-${clusterIdCounter.current++}`;

    setClusters(prev => [...prev, {
      id,
      lat,
      lon,
      name,
      startTime: Date.now(),
    }]);

    setStats(prev => ({ ...prev, infected: prev.infected + 1 }));
  }, [clusters.length, maxClusters]);

  // Créer une route vers une nouvelle ville
  const createRoute = useCallback((fromLat, fromLon) => {
    if (routes.length >= maxRoutes) return;

    // Trouver une ville non infectée
    const availableCities = MAJOR_CITIES.filter(
      city => !infectedCities.current.has(city.name)
    );

    if (availableCities.length === 0) return;

    // Choisir une ville avec probabilité inversement proportionnelle à la distance
    const distances = availableCities.map(city => ({
      city,
      distance: geoDistance(fromLat, fromLon, city.lat, city.lon),
    }));

    // Trier par distance et choisir parmi les plus proches avec un peu d'aléatoire
    distances.sort((a, b) => a.distance - b.distance);
    const targetIndex = Math.floor(Math.random() * Math.min(3, distances.length));
    const target = distances[targetIndex].city;

    const routeId = `route-${routeIdCounter.current++}`;

    setRoutes(prev => [...prev, {
      id: routeId,
      fromLat,
      fromLon,
      toLat: target.lat,
      toLon: target.lon,
      targetName: target.name,
    }]);

    infectedCities.current.add(target.name);
    setStats(prev => ({ ...prev, routes: prev.routes + 1 }));

    return target;
  }, [routes.length, maxRoutes]);

  // Callback quand une route arrive à destination
  const handleRouteArrival = useCallback(({ lat, lon, name }) => {
    addCluster(lat, lon, name);
  }, [addCluster]);

  // Réinitialiser
  const reset = useCallback(() => {
    setClusters([]);
    setRoutes([]);
    setIsRunning(false);
    setStats({ infected: 0, routes: 0 });
    clusterIdCounter.current = 0;
    routeIdCounter.current = 0;
    infectedCities.current.clear();
  }, []);

  return {
    clusters,
    routes,
    isRunning,
    stats,
    startInfection,
    startRandomInfection,
    addCluster,
    createRoute,
    handleRouteArrival,
    reset,
    config: {
      spreadSpeed,
      routeInterval,
      maxClusters,
      maxRoutes,
    },
  };
}

export default useInfection;
