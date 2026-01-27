import { useRef, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { InfectionCluster } from './InfectionCluster';
import { InfectionRoute } from './InfectionRoute';
import { useInfection } from '../../hooks/useInfection';
import { MAJOR_CITIES } from '../../utils/geoUtils';

/**
 * Composant InfectionSystem
 *
 * Système complet de propagation d'infection style Plague Inc
 * - Gère les clusters et routes automatiquement
 * - Crée des routes intercontinentales périodiquement
 * - Synchronisé avec la rotation de la Terre
 * - Interface de contrôle via props
 */
export function InfectionSystem({
  autoStart = false,
  startCity = null,         // { lat, lon } ou nom de ville
  spreadSpeed = 2,
  routeInterval = 5,
  maxClusters = 10,
  maxRoutes = 15,
  pointSize = 0.025,
  color = '#ff0000',
  rotationSpeed = 0.001,    // Doit correspondre à Earth.rotationSpeed
  onStatsUpdate,
}) {
  // Référence pour synchroniser la rotation avec la Terre
  const groupRef = useRef();
  const {
    clusters,
    routes,
    isRunning,
    stats,
    startInfection,
    startRandomInfection,
    createRoute,
    handleRouteArrival,
    config,
  } = useInfection({ spreadSpeed, routeInterval, maxClusters, maxRoutes });

  const lastRouteTime = useRef(0);
  const hasStarted = useRef(false);

  // Démarrage automatique
  useEffect(() => {
    if (autoStart && !hasStarted.current) {
      hasStarted.current = true;

      if (startCity) {
        if (typeof startCity === 'string') {
          const city = MAJOR_CITIES.find(c => c.name === startCity);
          if (city) {
            startInfection(city.lat, city.lon, city.name);
          } else {
            startRandomInfection();
          }
        } else {
          startInfection(startCity.lat, startCity.lon, startCity.name || 'Custom');
        }
      } else {
        startRandomInfection();
      }
    }
  }, [autoStart, startCity, startInfection, startRandomInfection]);

  // Notifier les mises à jour de stats
  useEffect(() => {
    if (onStatsUpdate) {
      onStatsUpdate(stats);
    }
  }, [stats, onStatsUpdate]);

  // Callback quand une route arrive
  const onRouteArrival = useCallback(({ lat, lon }) => {
    const route = routes.find(r => r.toLat === lat && r.toLon === lon);
    handleRouteArrival({ lat, lon, name: route?.targetName || 'Unknown' });
  }, [routes, handleRouteArrival]);

  // Logique de création de routes périodiques + synchronisation rotation
  useFrame((state) => {
    // Synchroniser la rotation avec la Terre
    if (groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed;
    }

    if (!isRunning || clusters.length === 0) return;

    const elapsed = state.clock.elapsedTime;

    // Créer une nouvelle route périodiquement
    if (elapsed - lastRouteTime.current > config.routeInterval) {
      lastRouteTime.current = elapsed;

      // Choisir un cluster source au hasard
      const sourceCluster = clusters[Math.floor(Math.random() * clusters.length)];
      createRoute(sourceCluster.lat, sourceCluster.lon);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Clusters d'infection */}
      {clusters.map((cluster, index) => (
        <InfectionCluster
          key={cluster.id}
          id={cluster.id}
          initialLat={cluster.lat}
          initialLon={cluster.lon}
          spreadSpeed={spreadSpeed}
          spreadRadius={12}
          maxPoints={30}
          pointSize={pointSize}
          color={color}
          delay={index === 0 ? 0 : 0.5}
        />
      ))}

      {/* Routes de transmission */}
      {routes.map((route) => (
        <InfectionRoute
          key={route.id}
          fromLat={route.fromLat}
          fromLon={route.fromLon}
          toLat={route.toLat}
          toLon={route.toLon}
          duration={3}
          color={color}
          onArrival={onRouteArrival}
          delay={0.2}
        />
      ))}
    </group>
  );
}

export default InfectionSystem;
