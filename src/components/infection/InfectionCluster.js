import { useState, useEffect, useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InfectionPoint } from './InfectionPoint';
import { randomNearbyPosition } from '../../utils/geoUtils';

/**
 * Composant InfectionCluster
 *
 * Gère un groupe de points d'infection qui se propagent
 * - Point initial + propagation progressive
 * - Génération de nouveaux points autour du centre
 * - Contrôle de la vitesse et du rayon de propagation
 */
export function InfectionCluster({
  id,
  initialLat,
  initialLon,
  spreadSpeed = 1,        // Vitesse de propagation (points par seconde)
  spreadRadius = 10,      // Rayon max de propagation en degrés
  maxPoints = 50,         // Nombre max de points dans le cluster
  pointSize = 0.025,
  color = '#ff0000',
  onSpreadComplete,       // Callback quand le cluster est complet
  delay = 0,
}) {
  const [points, setPoints] = useState([]);
  const lastSpreadTime = useRef(0);
  const isActive = useRef(false);
  const startTime = useRef(null);

  // Initialiser avec le point de départ
  useEffect(() => {
    setPoints([{
      id: `${id}-0`,
      lat: initialLat,
      lon: initialLon,
      delay: 0,
    }]);
  }, [id, initialLat, initialLon]);

  // Ajouter un nouveau point de propagation
  const addSpreadPoint = useCallback(() => {
    if (points.length >= maxPoints) {
      if (onSpreadComplete) onSpreadComplete(id);
      return;
    }

    // Choisir un point existant au hasard comme source
    const sourcePoint = points[Math.floor(Math.random() * points.length)];

    // Générer une position proche
    const newPos = randomNearbyPosition(
      sourcePoint.lat,
      sourcePoint.lon,
      spreadRadius / Math.sqrt(points.length + 1) // Réduire la distance au fur et à mesure
    );

    setPoints(prev => [...prev, {
      id: `${id}-${prev.length}`,
      lat: newPos.lat,
      lon: newPos.lon,
      delay: 0,
    }]);
  }, [points, maxPoints, spreadRadius, id, onSpreadComplete]);

  useFrame((state) => {
    if (!startTime.current) {
      startTime.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTime.current - delay;

    if (elapsed < 0) return;

    if (!isActive.current) {
      isActive.current = true;
    }

    // Propagation basée sur le temps
    const spreadInterval = 1 / spreadSpeed;
    if (elapsed - lastSpreadTime.current > spreadInterval && points.length < maxPoints) {
      lastSpreadTime.current = elapsed;
      addSpreadPoint();
    }
  });

  return (
    <group>
      {points.map((point, index) => (
        <InfectionPoint
          key={point.id}
          lat={point.lat}
          lon={point.lon}
          size={pointSize * (index === 0 ? 1.5 : 1)} // Le point initial est plus grand
          color={color}
          intensity={index === 0 ? 1.2 : 0.8}
          delay={delay + point.delay}
        />
      ))}
    </group>
  );
}

export default InfectionCluster;
