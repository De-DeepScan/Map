import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * CameraAnimator
 *
 * Anime la caméra du zoom sur un pays vers une vue globale
 * - Commence proche de la France
 * - S'éloigne progressivement
 * - S'arrête quand toute la planète est visible
 */
export function CameraAnimator({
  startLat = 200,        // Latitude de départ (France)
  startLon = 20,         // Longitude de départ (France)
  startDistance = 3.2,    // Distance initiale (proche)
  endDistance = 6,        // Distance finale (vue globale)
  duration = 8000,        // Durée de l'animation en ms
  delay = 1000,           // Délai avant de commencer
  enabled = true,
}) {
  const { camera } = useThree();
  const startTime = useRef(null);
  const isAnimating = useRef(true);
  const initialPosition = useRef(null);

  // Convertir lat/lon en position 3D
  const latLonToPosition = (lat, lon, distance) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    return new THREE.Vector3(
      -distance * Math.sin(phi) * Math.cos(theta),
      distance * Math.cos(phi),
      distance * Math.sin(phi) * Math.sin(theta)
    );
  };

  // Position initiale proche de la France
  useEffect(() => {
    if (!enabled) return;

    // Reset animation state pour permettre une nouvelle animation
    startTime.current = null;
    isAnimating.current = true;

    const startPos = latLonToPosition(startLat, startLon, startDistance);
    initialPosition.current = startPos.clone();
    camera.position.copy(startPos);
    camera.lookAt(0, 0, 0);
  }, [camera, startLat, startLon, startDistance, enabled]);

  useFrame((state) => {
    if (!enabled || !isAnimating.current) return;

    // Initialiser le temps de départ
    if (!startTime.current) {
      startTime.current = state.clock.elapsedTime * 1000;
    }

    const elapsed = state.clock.elapsedTime * 1000 - startTime.current - delay;

    // Attendre le délai
    if (elapsed < 0) return;

    // Calculer la progression (0 à 1)
    const progress = Math.min(1, elapsed / duration);

    // Easing: début lent, milieu rapide, fin lente
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpoler la distance
    const currentDistance = startDistance + (endDistance - startDistance) * eased;

    // Garder la même direction mais changer la distance
    if (initialPosition.current) {
      const direction = initialPosition.current.clone().normalize();
      camera.position.copy(direction.multiplyScalar(currentDistance));
      camera.lookAt(0, 0, 0);
    }

    // Arrêter l'animation
    if (progress >= 1) {
      isAnimating.current = false;
    }
  });

  return null;
}

export default CameraAnimator;
