import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latLonToVector3, EARTH_RADIUS } from '../../utils/geoUtils';

/**
 * PulseRing - один пульсирующий круг
 */
function PulseRing({ position, normal, color, phase, speed }) {
  const ringRef = useRef();
  const materialRef = useRef();

  useFrame((state) => {
    const time = state.clock.elapsedTime * speed + phase;
    // Цикл от 0 до 1
    const cycle = (time % 3) / 3;

    if (ringRef.current && materialRef.current) {
      // Размер растёт от 0.02 до 0.15
      const scale = 0.02 + cycle * 0.13;
      ringRef.current.scale.setScalar(scale);

      // Прозрачность уменьшается по мере роста
      materialRef.current.opacity = 0.6 * (1 - cycle);
    }
  });

  // Ориентация кольца по нормали к сфере
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
    return q;
  }, [normal]);

  return (
    <mesh ref={ringRef} position={position} quaternion={quaternion}>
      <ringGeometry args={[0.8, 1, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * InfectionOrigin
 *
 * Точка начала заражения с пульсирующими кругами
 */
export function InfectionOrigin({
  lat = 48.9,           // Paris
  lon = 2.3,
  color = '#ff0000',
  pulseSpeed = 1,
  rotationSpeed = 0.001,
  ringsCount = 3,       // Количество колец
}) {
  const groupRef = useRef();
  const coreRef = useRef();

  // Позиция на сфере
  const position = useMemo(() => {
    return latLonToVector3(lat, lon, EARTH_RADIUS + 0.015);
  }, [lat, lon]);

  // Нормаль для ориентации колец
  const normal = useMemo(() => {
    return position.clone().normalize();
  }, [position]);

  // Фазы для колец (чтобы они шли друг за другом)
  const ringPhases = useMemo(() => {
    return Array.from({ length: ringsCount }, (_, i) => (i * 3) / ringsCount);
  }, [ringsCount]);

  // Анимация
  useFrame((state) => {
    const time = state.clock.elapsedTime * pulseSpeed;

    // Ротация
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed;
    }

    // Мягкая пульсация ядра
    if (coreRef.current) {
      const pulse = 1 + 0.2 * Math.sin(time * 2);
      coreRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Центральная точка */}
      <mesh ref={coreRef} position={position}>
        <sphereGeometry args={[0.015, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Пульсирующие круги */}
      {ringPhases.map((phase, index) => (
        <PulseRing
          key={index}
          position={position}
          normal={normal}
          color={color}
          phase={phase}
          speed={pulseSpeed}
        />
      ))}
    </group>
  );
}

export default InfectionOrigin;
