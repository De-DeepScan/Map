import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latLonToVector3, EARTH_RADIUS } from '../../utils/geoUtils';

/**
 * InfectionBubbles
 *
 * Rendu des bulles d'infection pour UN pays avec InstancedMesh
 * - Distribution en spirale de Fermat autour du centroid
 * - Animation de pulsation organique
 * - Animation d'apparition progressive
 */
export function InfectionBubbles({
  countryName,
  centroid,              // { lat, lon }
  bubbleCount,           // Nombre actuel de bulles
  maxBubbles = 80,       // Max par pays
  color = '#ff2222',
  baseSize = 0.018,      // Taille de base des bulles
}) {
  const meshRef = useRef();
  const bubblesDataRef = useRef([]);
  const dummyRef = useRef(new THREE.Object3D());

  // Position 3D du centroid sur la sphere
  const centerPosition = useMemo(() => {
    if (!centroid) return new THREE.Vector3(0, EARTH_RADIUS, 0);
    return latLonToVector3(centroid.lat, centroid.lon, EARTH_RADIUS + 0.025);
  }, [centroid]);

  // Normale pour orienter les offsets (pointe vers l'exterieur)
  const normal = useMemo(() => {
    return centerPosition.clone().normalize();
  }, [centerPosition]);

  // Vecteurs tangents pour le placement en spirale
  const { tangent1, tangent2 } = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    let t1 = new THREE.Vector3().crossVectors(up, normal);

    // Si normal est trop proche de up, utiliser un autre vecteur
    if (t1.length() < 0.001) {
      t1 = new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), normal);
    }
    t1.normalize();

    const t2 = new THREE.Vector3().crossVectors(normal, t1).normalize();

    return { tangent1: t1, tangent2: t2 };
  }, [normal]);

  // Constante de spirale de Fermat (angle d'or)
  const goldenAngle = useMemo(() => Math.PI * (3 - Math.sqrt(5)), []);

  // Initialiser les donnees des bulles (phases aleatoires)
  useEffect(() => {
    const newData = [];
    for (let i = 0; i < maxBubbles; i++) {
      newData.push({
        phase: Math.random() * Math.PI * 2,
        birthTime: null,
        scale: 0.8 + Math.random() * 0.4, // Variation de taille
      });
    }
    bubblesDataRef.current = newData;
  }, [maxBubbles]);

  // Mettre a jour birthTime quand de nouvelles bulles apparaissent
  const prevBubbleCountRef = useRef(0);
  useEffect(() => {
    const now = performance.now() / 1000;
    for (let i = prevBubbleCountRef.current; i < bubbleCount; i++) {
      if (bubblesDataRef.current[i]) {
        bubblesDataRef.current[i].birthTime = now;
      }
    }
    prevBubbleCountRef.current = bubbleCount;
  }, [bubbleCount]);

  // Calculer la position d'une bulle en spirale de Fermat
  const calculateBubblePosition = (index, total) => {
    if (index === 0) {
      return centerPosition.clone();
    }

    // Distribution en spirale de Fermat
    const angle = index * goldenAngle;
    const radius = 0.04 * Math.sqrt(index / Math.max(1, total - 1));

    // Position sur le disque tangent
    const offsetX = Math.cos(angle) * radius;
    const offsetY = Math.sin(angle) * radius;

    const offset = tangent1.clone().multiplyScalar(offsetX)
      .add(tangent2.clone().multiplyScalar(offsetY));

    // Projeter sur la sphere
    const position = centerPosition.clone().add(offset);
    position.normalize().multiplyScalar(EARTH_RADIUS + 0.025);

    return position;
  };

  // Mettre a jour les matrices d'instance chaque frame
  useFrame((state) => {
    if (!meshRef.current || bubbleCount === 0) return;

    const time = state.clock.elapsedTime;
    const dummy = dummyRef.current;

    for (let i = 0; i < bubbleCount; i++) {
      const bubbleData = bubblesDataRef.current[i];
      if (!bubbleData) continue;

      const position = calculateBubblePosition(i, bubbleCount);
      dummy.position.copy(position);

      // Pulsation organique (phase decalee par bulle)
      const pulse = 1 + 0.2 * Math.sin(time * 2.5 + bubbleData.phase);

      // Animation d'apparition (0.5s pour apparaitre)
      let appear = 1;
      if (bubbleData.birthTime !== null) {
        const age = time - bubbleData.birthTime;
        appear = Math.min(1, age / 0.5);
        // Ease out
        appear = 1 - Math.pow(1 - appear, 3);
      }

      const finalScale = baseSize * pulse * appear * bubbleData.scale;
      dummy.scale.setScalar(finalScale);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    // Cacher les bulles non utilisees
    for (let i = bubbleCount; i < maxBubbles; i++) {
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Materiau avec effet de glow
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // Gradient radial du centre vers les bords
          float dist = length(vPosition);
          float gradient = 1.0 - smoothstep(0.0, 1.0, dist);

          // Effet de glow sur les bords
          float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          rim = pow(rim, 2.0);

          // Couleur finale avec glow
          vec3 finalColor = uColor * (gradient * 0.8 + 0.2);
          float alpha = gradient * 0.9 + rim * 0.3;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [color]);

  // Mettre a jour le temps dans le shader
  useFrame((state) => {
    if (material.uniforms) {
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  if (!centroid) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, maxBubbles]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 12, 12]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  );
}

export default InfectionBubbles;
