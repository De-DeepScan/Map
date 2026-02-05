import { useEffect, useRef, useLayoutEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * CameraResetManager
 *
 * Composant qui coordonne le reset de la caméra et d'OrbitControls
 * quand l'animation démarre. Résout le problème où OrbitControls
 * maintenait sa propre position interne.
 */
export function CameraResetManager({
  controlsRef,
  enabled = false,
  startLat = 30,
  startLon = -150,
  startDistance = 3.5,
}) {
  const { camera } = useThree();
  const prevEnabled = useRef(enabled);
  const needsReset = useRef(false);
  const resetAttempts = useRef(0);

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

  // Fonction de reset partagée
  const performReset = () => {
    // Calculer la position de départ (France/Bordeaux)
    const startPos = latLonToPosition(startLat, startLon, startDistance);

    // Réinitialiser la position de la caméra
    camera.position.copy(startPos);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    // Réinitialiser OrbitControls si disponible
    if (controlsRef?.current) {
      const controls = controlsRef.current;

      // Réinitialiser le target au centre
      controls.target.set(0, 0, 0);

      // Forcer la mise à jour immédiate
      controls.update();

      // Sauvegarder cet état comme l'état initial pour reset()
      controls.saveState();

      return true; // Reset réussi
    }
    return false; // OrbitControls pas encore prêt
  };

  // Détecter quand enabled passe de false à true
  useLayoutEffect(() => {
    const justEnabled = enabled && !prevEnabled.current;
    prevEnabled.current = enabled;

    if (justEnabled) {
      // Marquer qu'un reset est nécessaire
      needsReset.current = true;
      resetAttempts.current = 0;

      // Tenter le reset immédiatement
      if (performReset()) {
        needsReset.current = false;
      }
    }

    // Reset le flag quand l'animation est désactivée
    if (!enabled) {
      needsReset.current = false;
      resetAttempts.current = 0;
    }
  }, [enabled, camera, startLat, startLon, startDistance]);

  // Backup: utiliser useFrame pour garantir le reset si la ref n'était pas prête
  useFrame(() => {
    if (needsReset.current && resetAttempts.current < 10) {
      resetAttempts.current++;
      if (performReset()) {
        needsReset.current = false;
      }
    }
  });

  return null;
}

export default CameraResetManager;
