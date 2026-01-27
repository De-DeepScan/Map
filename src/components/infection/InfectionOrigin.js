import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latLonToVector3, EARTH_RADIUS } from '../../utils/geoUtils';

/**
 * InfectionOrigin
 *
 * Точка начала заражения с пульсирующим эффектом
 * - Светящаяся точка
 * - Расходящиеся кольца (волны)
 * - Анимация пульсации
 */
export function InfectionOrigin({
  lat = 48.9,           // Paris
  lon = 2.3,
  color = '#ff0000',
  pulseSpeed = 2,
  maxRings = 3,
  rotationSpeed = 0.001,
}) {
  const groupRef = useRef();
  const ringsRef = useRef([]);
  const coreRef = useRef();
  const glowRef = useRef();

  // Position sur la sphère
  const position = useMemo(() => {
    return latLonToVector3(lat, lon, EARTH_RADIUS + 0.02);
  }, [lat, lon]);

  // Direction normale (pour orienter les anneaux)
  const normal = useMemo(() => {
    return position.clone().normalize();
  }, [position]);

  // Matériau pour les anneaux
  const ringMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        time: { value: 0 },
        ringIndex: { value: 0 },
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
        uniform float time;
        uniform float ringIndex;
        varying vec2 vUv;

        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center) * 2.0;

          // Anneau fin
          float ring = smoothstep(0.8, 0.85, dist) * smoothstep(1.0, 0.95, dist);

          // Fade basé sur le temps et l'index
          float phase = fract(time * 0.5 + ringIndex * 0.33);
          float fade = 1.0 - phase;

          gl_FragColor = vec4(color, ring * fade * 0.8);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [color]);

  // Animation
  useFrame((state) => {
    const time = state.clock.elapsedTime * pulseSpeed;

    // Rotation du groupe
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed;
    }

    // Pulsation du core
    if (coreRef.current) {
      const pulse = 1 + 0.3 * Math.sin(time * 3);
      coreRef.current.scale.setScalar(pulse);
    }

    // Pulsation du glow
    if (glowRef.current) {
      const glowPulse = 1 + 0.2 * Math.sin(time * 3 + 0.5);
      glowRef.current.scale.setScalar(glowPulse);
      glowRef.current.material.opacity = 0.4 + 0.2 * Math.sin(time * 3);
    }

    // Mise à jour des anneaux
    ringsRef.current.forEach((ring, i) => {
      if (ring && ring.material) {
        ring.material.uniforms.time.value = time;

        // Expansion des anneaux (plus petit)
        const phase = (time * 0.5 + i * 0.33) % 1;
        const scale = 0.03 + phase * 0.12;
        ring.scale.setScalar(scale);
      }
    });
  });

  // Créer la rotation pour aligner avec la surface
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return q;
  }, [normal]);

  return (
    <group ref={groupRef}>
      <group position={position} quaternion={quaternion}>
        {/* Core central lumineux (petit) */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[0.012, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>

        {/* Glow autour du core (petit) */}
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Anneaux qui s'étendent */}
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            ref={(el) => (ringsRef.current[i] = el)}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.8, 1, 32]} />
            <primitive
              object={ringMaterial.clone()}
              attach="material"
              uniforms-ringIndex-value={i}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default InfectionOrigin;
