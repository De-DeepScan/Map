import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latLonToVector3, EARTH_RADIUS } from '../../utils/geoUtils';

/**
 * Composant InfectionPoint
 *
 * Point d'infection unique sur la surface de la Terre
 * - Apparition progressive (scale + opacity)
 * - Effet de lueur pulsante
 * - Positionnement via latitude/longitude
 */
export function InfectionPoint({
  lat,
  lon,
  size = 0.03,
  color = '#ff0000',
  pulseSpeed = 2,
  intensity = 1,
  delay = 0,
}) {
  const meshRef = useRef();
  const glowRef = useRef();
  const startTime = useRef(null);

  // Position sur la sphère (légèrement au-dessus de la surface)
  const position = useMemo(() => {
    return latLonToVector3(lat, lon, EARTH_RADIUS + 0.01);
  }, [lat, lon]);

  // Orientation pour faire face à l'extérieur
  const lookAtPosition = useMemo(() => {
    return latLonToVector3(lat, lon, EARTH_RADIUS + 1);
  }, [lat, lon]);

  // Matériau lumineux pour le point central
  const pointMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0,
    });
  }, [color]);

  // Matériau pour la lueur externe
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        intensity: { value: intensity },
        time: { value: 0 },
        opacity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float intensity;
        uniform float time;
        uniform float opacity;
        varying vec2 vUv;

        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);

          // Dégradé radial avec pulsation
          float pulse = 0.8 + 0.2 * sin(time * 3.0);
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * intensity * pulse * opacity;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [color, intensity]);

  useFrame((state) => {
    if (!startTime.current) {
      startTime.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTime.current - delay;

    if (elapsed < 0) return;

    // Animation d'apparition (0 à 1 sur 0.5 secondes)
    const appearProgress = Math.min(1, elapsed / 0.5);
    const easeOut = 1 - Math.pow(1 - appearProgress, 3);

    // Mise à jour du point central
    if (meshRef.current) {
      meshRef.current.scale.setScalar(easeOut);
      pointMaterial.opacity = easeOut * 0.9;
    }

    // Mise à jour de la lueur
    if (glowRef.current) {
      glowRef.current.scale.setScalar(easeOut * (1 + 0.2 * Math.sin(elapsed * pulseSpeed)));
      glowMaterial.uniforms.time.value = elapsed;
      glowMaterial.uniforms.opacity.value = easeOut;
    }
  });

  return (
    <group position={position}>
      {/* Point central */}
      <mesh
        ref={meshRef}
        material={pointMaterial}
        lookAt={lookAtPosition}
        scale={0}
      >
        <circleGeometry args={[size, 16]} />
      </mesh>

      {/* Lueur externe */}
      <mesh
        ref={glowRef}
        material={glowMaterial}
        lookAt={lookAtPosition}
        scale={0}
      >
        <circleGeometry args={[size * 3, 32]} />
      </mesh>
    </group>
  );
}

export default InfectionPoint;
