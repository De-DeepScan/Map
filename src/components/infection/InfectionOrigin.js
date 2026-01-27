import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latLonToVector3, EARTH_RADIUS } from '../../utils/geoUtils';

/**
 * InfectionOrigin
 *
 * Простая точка начала заражения
 * - Маленькая пульсирующая точка без яркого свечения
 */
export function InfectionOrigin({
  lat = 48.9,           // Paris
  lon = 2.3,
  color = '#ff0000',
  pulseSpeed = 2,
  rotationSpeed = 0.001,
}) {
  const groupRef = useRef();
  const coreRef = useRef();

  // Позиция на сфере
  const position = useMemo(() => {
    return latLonToVector3(lat, lon, EARTH_RADIUS + 0.015);
  }, [lat, lon]);

  // Анимация
  useFrame((state) => {
    const time = state.clock.elapsedTime * pulseSpeed;

    // Ротация
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed;
    }

    // Мягкая пульсация
    if (coreRef.current) {
      const pulse = 1 + 0.2 * Math.sin(time * 2);
      coreRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Простая точка без яркого glow */}
      <mesh ref={coreRef} position={position}>
        <sphereGeometry args={[0.015, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

export default InfectionOrigin;
