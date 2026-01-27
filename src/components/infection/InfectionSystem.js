import { useRef, useEffect, useCallback, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { InfectionOverlay } from './InfectionOverlay';
import { InfectionRoute } from './InfectionRoute';
import { useInfection } from '../../hooks/useInfection';
import { MAJOR_CITIES } from '../../utils/geoUtils';

/**
 * Composant InfectionSystem
 *
 * Système complet de propagation d'infection style Plague Inc
 * - Taches 2D qui s'étendent sur la surface (style sépia/encre)
 * - Routes intercontinentales avec animation
 * - Synchronisé avec la rotation de la Terre
 */
export function InfectionSystem({
  autoStart = false,
  startCity = null,
  spreadSpeed = 2,
  routeInterval = 5,
  maxClusters = 10,
  maxRoutes = 15,
  color = '#ff0000',
  rotationSpeed = 0.001,
  onStatsUpdate,
}) {
  const groupRef = useRef();

  // Points d'infection avec leur rayon qui grandit
  const [infectionPoints, setInfectionPoints] = useState([]);

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

  // Convertir clusters en points d'infection avec rayons croissants
  useEffect(() => {
    const points = clusters.map((cluster, index) => ({
      id: cluster.id,
      lat: cluster.lat,
      lon: cluster.lon,
      radius: 0,           // Commence à 0, grandit avec le temps
      targetRadius: 20,    // Rayon final
      intensity: 1,
      startTime: cluster.startTime || Date.now(),
      isPrimary: index === 0,
    }));

    setInfectionPoints(points);
  }, [clusters]);

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

  // Animation: faire grandir les taches + créer des routes
  useFrame((state) => {
    // Synchroniser la rotation avec la Terre
    if (groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed;
    }

    // Faire grandir les taches d'infection (lentement)
    setInfectionPoints(prev => prev.map(point => {
      const elapsed = (Date.now() - point.startTime) / 1000;
      const growthRate = point.isPrimary ? 0.5 : 0.3; // Croissance lente

      // Croissance avec easing (rapide au début, lent à la fin)
      const progress = Math.min(1, elapsed * growthRate / point.targetRadius);
      const easedProgress = 1 - Math.pow(1 - progress, 2);

      return {
        ...point,
        radius: easedProgress * point.targetRadius,
        intensity: 0.7 + 0.3 * easedProgress,
      };
    }));

    if (!isRunning || clusters.length === 0) return;

    const elapsed = state.clock.elapsedTime;

    // Créer une nouvelle route périodiquement
    if (elapsed - lastRouteTime.current > config.routeInterval) {
      lastRouteTime.current = elapsed;

      const sourceCluster = clusters[Math.floor(Math.random() * clusters.length)];
      createRoute(sourceCluster.lat, sourceCluster.lon);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Overlay 2D de l'infection (taches qui s'étendent) */}
      <InfectionOverlay
        infectionPoints={infectionPoints}
        color={color}
        maxPoints={50}
        rotationSpeed={0} // Déjà géré par le groupe parent
      />

      {/* Routes de transmission (lignes courbes) */}
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
