import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS } from '../utils/geoUtils';

/**
 * OceanGrid - Тонкая цифровая сетка для океанов
 *
 * Создает эффект "пустых зон" между континентами
 * с тонкими голубыми линиями в цифровом стиле
 */
export function OceanGrid({
  color = '#00aaff',
  opacity = 0.3,
  gridDensity = 36, // Количество линий по широте/долготе
  rotationSpeed = 0.001,
  pulseSpeed = 1.5,
  enabled = true,
}) {
  const groupRef = useRef();
  const materialRef = useRef();

  // Радиус чуть меньше чем у GeoJSON слоя (который на EARTH_RADIUS + 0.01)
  // чтобы сетка была под границами стран
  const radius = EARTH_RADIUS - 0.005;

  // Создаем геометрию линий сетки - возвращаем BufferGeometry вместо точек
  const gridGeometries = useMemo(() => {
    const geometries = [];

    // Линии широты (горизонтальные)
    for (let lat = -80; lat <= 80; lat += 180 / gridDensity) {
      const latRad = (90 - lat) * (Math.PI / 180);
      const points = [];

      for (let lon = 0; lon <= 360; lon += 2) {
        const lonRad = lon * (Math.PI / 180);
        const x = -radius * Math.sin(latRad) * Math.cos(lonRad);
        const y = radius * Math.cos(latRad);
        const z = radius * Math.sin(latRad) * Math.sin(lonRad);
        points.push(new THREE.Vector3(x, y, z));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      geometries.push(geometry);
    }

    // Линии долготы (вертикальные)
    for (let lon = 0; lon < 360; lon += 360 / gridDensity) {
      const lonRad = lon * (Math.PI / 180);
      const points = [];

      for (let lat = -90; lat <= 90; lat += 2) {
        const latRad = (90 - lat) * (Math.PI / 180);
        const x = -radius * Math.sin(latRad) * Math.cos(lonRad);
        const y = radius * Math.cos(latRad);
        const z = radius * Math.sin(latRad) * Math.sin(lonRad);
        points.push(new THREE.Vector3(x, y, z));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      geometries.push(geometry);
    }

    return geometries;
  }, [radius, gridDensity]);

  // Cleanup: dispose geometries on unmount
  useEffect(() => {
    return () => {
      gridGeometries.forEach(geom => geom.dispose());
    };
  }, [gridGeometries]);

  // Анимация
  useFrame((state) => {
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed;
    }

    // Пульсация opacity
    if (materialRef.current && pulseSpeed) {
      const pulse = Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.1 + 0.9;
      materialRef.current.opacity = opacity * pulse;
    }
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef}>
      {gridGeometries.map((geometry, index) => (
        <line key={`grid-line-${index}`} geometry={geometry}>
          <lineBasicMaterial
            ref={index === 0 ? materialRef : undefined}
            color={color}
            transparent={true}
            opacity={opacity}
            depthTest={true}
            depthWrite={false}
          />
        </line>
      ))}
    </group>
  );
}

/**
 * OceanGridShader - Сетка только над океанами
 * Использует specular карту Земли как маску (океаны = яркие области)
 */
export function OceanGridShader({
  color = '#00aaff',
  opacity = 0.25,
  gridSize = 40.0,
  lineWidth = 0.015,
  rotationSpeed = 0.001,
  pulseSpeed = 1.0,
  glowIntensity = 0.5,
  oceanMaskUrl = '/textures/earth_specular.jpg',
  maskThreshold = 0.3, // Порог для определения океана
  enabled = true,
}) {
  const meshRef = useRef();
  const materialRef = useRef();

  const radius = EARTH_RADIUS - 0.005;

  // Загружаем текстуру маски океана
  const oceanMask = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const texture = loader.load(oceanMaskUrl);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, [oceanMaskUrl]);

  // Шейдер материал для сетки с маской океана
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
        uTime: { value: 0 },
        uGridSize: { value: gridSize },
        uLineWidth: { value: lineWidth },
        uGlowIntensity: { value: glowIntensity },
        uOceanMask: { value: oceanMask },
        uMaskThreshold: { value: maskThreshold },
        uPulseSpeed: { value: pulseSpeed },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;
        uniform float uGridSize;
        uniform float uLineWidth;
        uniform float uGlowIntensity;
        uniform sampler2D uOceanMask;
        uniform float uMaskThreshold;
        uniform float uPulseSpeed;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // Читаем маску океана (specular map: океан = яркий)
          float oceanValue = texture2D(uOceanMask, vUv).r;

          // Если это суша (темная область), не рисуем сетку
          if (oceanValue < uMaskThreshold) {
            discard;
          }

          // Мягкий переход на границе суша/океан
          float oceanMask = smoothstep(uMaskThreshold, uMaskThreshold + 0.15, oceanValue);

          // Преобразуем UV в координаты сетки
          vec2 grid = fract(vUv * uGridSize);

          // Создаем линии сетки
          float lineX = smoothstep(uLineWidth, 0.0, grid.x) + smoothstep(1.0 - uLineWidth, 1.0, grid.x);
          float lineY = smoothstep(uLineWidth, 0.0, grid.y) + smoothstep(1.0 - uLineWidth, 1.0, grid.y);

          float line = max(lineX, lineY);

          // Пульсация
          float pulse = sin(uTime * uPulseSpeed) * 0.15 + 0.85;

          // Эффект Fresnel (ярче по краям)
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);
          float fresnelBoost = 1.0 + fresnel * uGlowIntensity;

          // Финальный цвет с учетом маски океана
          float alpha = line * uOpacity * pulse * fresnelBoost * oceanMask;

          // Добавляем легкое свечение
          vec3 finalColor = uColor * (1.0 + fresnel * 0.3);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [color, opacity, gridSize, lineWidth, glowIntensity, oceanMask, maskThreshold, pulseSpeed]);

  // Cleanup: dispose texture and material on unmount
  useEffect(() => {
    return () => {
      if (oceanMask) oceanMask.dispose();
      if (shaderMaterial) shaderMaterial.dispose();
    };
  }, [oceanMask, shaderMaterial]);

  // Анимация
  useFrame((state) => {
    if (meshRef.current && rotationSpeed) {
      meshRef.current.rotation.y += rotationSpeed;
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  if (!enabled) return null;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, 32, 32]} />
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

export default OceanGrid;
