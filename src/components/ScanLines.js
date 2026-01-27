import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * ScanLines - Анимированные линии сканирования
 *
 * Создаёт эффект сканирования планеты:
 * - Горизонтальные линии, проходящие сверху вниз
 * - Светящийся эффект при прохождении
 * - Цифровой/технологичный вид
 */

/**
 * Шейдер для линии сканирования на сфере
 */
const scanLineVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const scanLineFragmentShader = `
  uniform float time;
  uniform float scanSpeed;
  uniform vec3 scanColor;
  uniform float scanWidth;
  uniform float glowIntensity;
  uniform float scanCount;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    // Нормализованная Y позиция (-1 до 1)
    float normalizedY = vPosition.y / 2.0;

    // Позиция сканирующей линии (движется сверху вниз)
    float scanPos = mod(time * scanSpeed, 2.0) - 1.0;

    // Множественные линии сканирования
    float totalIntensity = 0.0;

    for (float i = 0.0; i < 3.0; i++) {
      float offset = i * 0.4;
      float currentScanPos = mod(scanPos + offset, 2.0) - 1.0;

      // Расстояние до линии сканирования
      float dist = abs(normalizedY - currentScanPos);

      // Основная линия
      float line = smoothstep(scanWidth, 0.0, dist);

      // Свечение вокруг линии
      float glow = smoothstep(scanWidth * 4.0, 0.0, dist) * glowIntensity;

      totalIntensity += line + glow * 0.5;
    }

    // Добавляем горизонтальные тонкие линии (сетка)
    float gridLines = 0.0;
    float gridSpacing = 0.05;
    float gridY = mod(normalizedY + 1.0, gridSpacing);
    gridLines = smoothstep(0.002, 0.0, gridY) * 0.3;

    // Комбинируем
    float finalIntensity = clamp(totalIntensity + gridLines, 0.0, 1.0);

    // Fresnel эффект для видимости только на краях (более реалистично)
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);

    // Финальный цвет
    vec3 color = scanColor * finalIntensity;
    float alpha = finalIntensity * (0.3 + fresnel * 0.7);

    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Основной компонент сканирующей сферы
 */
function ScanSphere({
  radius = 2.05,
  color = '#00ffff',
  scanSpeed = 0.5,
  scanWidth = 0.02,
  glowIntensity = 0.5,
}) {
  const meshRef = useRef();
  const materialRef = useRef();

  const uniforms = useMemo(() => ({
    time: { value: 0 },
    scanSpeed: { value: scanSpeed },
    scanColor: { value: new THREE.Color(color) },
    scanWidth: { value: scanWidth },
    glowIntensity: { value: glowIntensity },
    scanCount: { value: 3 },
  }), [color, scanSpeed, scanWidth, glowIntensity]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={scanLineVertexShader}
        fragmentShader={scanLineFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/**
 * Вертикальная сканирующая плоскость
 */
function ScanPlane({
  height = 6,
  width = 6,
  color = '#00ffff',
  speed = 1,
  opacity = 0.15,
}) {
  const planeRef = useRef();
  const materialRef = useRef();
  const positionRef = useRef(-height / 2);

  useFrame((state, delta) => {
    if (planeRef.current) {
      // Движение сверху вниз
      positionRef.current += speed * delta;
      if (positionRef.current > height / 2) {
        positionRef.current = -height / 2;
      }
      planeRef.current.position.y = positionRef.current;
    }

    if (materialRef.current) {
      // Пульсация
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.3 + 0.7;
      materialRef.current.opacity = opacity * pulse;
    }
  });

  return (
    <mesh ref={planeRef} rotation={[0, 0, 0]}>
      <planeGeometry args={[width, 0.02]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Кольцо сканирования (горизонтальное кольцо, движущееся по планете)
 */
function ScanRing({
  baseRadius = 2,
  color = '#00ffff',
  speed = 0.8,
  thickness = 0.01,
}) {
  const groupRef = useRef();
  const materialRef = useRef();
  const progressRef = useRef(0);

  useFrame((state, delta) => {
    progressRef.current += speed * delta;
    if (progressRef.current > Math.PI) {
      progressRef.current = 0;
    }

    if (groupRef.current) {
      // Позиция Y на сфере
      const y = Math.cos(progressRef.current) * baseRadius;
      // Радиус кольца на данной высоте
      const ringRadius = Math.sin(progressRef.current) * baseRadius;

      groupRef.current.position.y = y;
      groupRef.current.scale.set(ringRadius, ringRadius, ringRadius);
    }

    if (materialRef.current) {
      // Яркость зависит от позиции (ярче в центре)
      const brightness = Math.sin(progressRef.current);
      materialRef.current.opacity = brightness * 0.8;
    }
  });

  const geometry = useMemo(() => {
    const points = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle),
        0,
        Math.sin(angle)
      ));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  return (
    <group ref={groupRef}>
      <line geometry={geometry}>
        <lineBasicMaterial
          ref={materialRef}
          color={color}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </line>
    </group>
  );
}

/**
 * Главный компонент ScanLines
 */
export function ScanLines({
  earthRadius = 2,
  primaryColor = '#00ffff',
  secondaryColor = '#00ff88',
  enabled = true,
}) {
  if (!enabled) return null;

  return (
    <group>
      {/* Сканирующая сфера с шейдером */}
      <ScanSphere
        radius={earthRadius + 0.05}
        color={primaryColor}
        scanSpeed={0.4}
        scanWidth={0.015}
        glowIntensity={0.6}
      />

      {/* Движущиеся кольца сканирования */}
      <ScanRing
        baseRadius={earthRadius + 0.08}
        color={primaryColor}
        speed={0.6}
        thickness={0.01}
      />

      <ScanRing
        baseRadius={earthRadius + 0.1}
        color={secondaryColor}
        speed={0.8}
        thickness={0.01}
      />

      {/* Вертикальная плоскость сканирования */}
      <ScanPlane
        height={earthRadius * 3}
        width={earthRadius * 3}
        color={primaryColor}
        speed={1.2}
        opacity={0.1}
      />
    </group>
  );
}

export default ScanLines;
