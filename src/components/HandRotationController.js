import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * HandRotationController
 *
 * Composant Three.js qui applique la rotation de la main au groupe cible
 * Avec inertie pour un mouvement fluide
 */
export function HandRotationController({ targetRef, rotationDelta = 0, enabled = true }) {
  const accumulatedRotation = useRef(0);
  const velocityRef = useRef(0);

  useFrame(() => {
    if (!enabled || !targetRef?.current) return;

    // Ajouter le delta a la velocite
    if (Math.abs(rotationDelta) > 0.0005) {
      velocityRef.current = rotationDelta;
    } else {
      // Inertie - ralentir progressivement
      velocityRef.current *= 0.98;
    }

    // Appliquer la velocite a la rotation
    if (Math.abs(velocityRef.current) > 0.0001) {
      accumulatedRotation.current += velocityRef.current;
      targetRef.current.rotation.y = accumulatedRotation.current;
    }
  });

  // Reset quand desactive
  useEffect(() => {
    if (!enabled) {
      accumulatedRotation.current = 0;
      velocityRef.current = 0;
    }
  }, [enabled]);

  return null;
}

export default HandRotationController;
