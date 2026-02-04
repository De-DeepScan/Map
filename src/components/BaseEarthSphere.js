import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS } from '../utils/geoUtils';

/**
 * BaseEarthSphere - Sphère de base pour éviter les trous
 * Très légèrement visible pour donner un fond uniforme
 */
export function BaseEarthSphere({
  color = '#0a0a15',      // Bleu très sombre (cyberpunk)
  opacity = 0.3,          // Très transparent
  rotationSpeed = 0.001,
  enabled = true,
}) {
  const meshRef = useRef();

  const radius = EARTH_RADIUS - 0.02;  // 1.98 - en dessous de tout

  useFrame(() => {
    if (meshRef.current && rotationSpeed) {
      meshRef.current.rotation.y += rotationSpeed;
    }
  });

  if (!enabled) return null;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthTest={true}
        depthWrite={false}
      />
    </mesh>
  );
}

export default BaseEarthSphere;
