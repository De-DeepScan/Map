import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latLonToVector3, createArcBetweenPoints, EARTH_RADIUS } from '../../utils/geoUtils';

/**
 * Composant InfectionRoute
 *
 * Ligne de transmission entre deux points d'infection
 * - Arc courbe au-dessus de la surface de la Terre
 * - Animation de flux/impulsion le long de la ligne
 * - Effet de lueur rouge
 */
export function InfectionRoute({
  fromLat,
  fromLon,
  toLat,
  toLon,
  duration = 3,           // Durée du voyage en secondes
  color = '#ff3333',
  onArrival,              // Callback à l'arrivée
  delay = 0,
}) {
  const lineRef = useRef();
  const pulseRef = useRef();
  const [arrived, setArrived] = useState(false);
  const startTime = useRef(null);

  // Calculer les positions et la courbe
  const { startPos, endPos, curve, points } = useMemo(() => {
    const start = latLonToVector3(fromLat, fromLon, EARTH_RADIUS + 0.02);
    const end = latLonToVector3(toLat, toLon, EARTH_RADIUS + 0.02);
    const arc = createArcBetweenPoints(start, end, 0.3);
    const pts = arc.getPoints(50);

    return {
      startPos: start,
      endPos: end,
      curve: arc,
      points: pts,
    };
  }, [fromLat, fromLon, toLat, toLon]);

  // Matériau de la ligne avec dégradé
  const lineMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        progress: { value: 0 },
        opacity: { value: 0 },
      },
      vertexShader: `
        attribute float lineProgress;
        varying float vProgress;

        void main() {
          vProgress = lineProgress;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float progress;
        uniform float opacity;
        varying float vProgress;

        void main() {
          // La ligne s'allume progressivement
          float visibility = smoothstep(progress - 0.1, progress, vProgress);
          float fade = smoothstep(0.0, 0.05, vProgress) * smoothstep(1.0, 0.95, vProgress);

          gl_FragColor = vec4(color, visibility * fade * opacity * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [color]);

  // Géométrie de la ligne avec attribut de progression
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    // Ajouter l'attribut de progression le long de la ligne
    const progressArray = new Float32Array(points.length);
    for (let i = 0; i < points.length; i++) {
      progressArray[i] = i / (points.length - 1);
    }
    geometry.setAttribute('lineProgress', new THREE.BufferAttribute(progressArray, 1));

    return geometry;
  }, [points]);

  // Matériau pour l'impulsion qui voyage
  const pulseMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0,
    });
  }, [color]);

  useFrame((state) => {
    if (!startTime.current) {
      startTime.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTime.current - delay;

    if (elapsed < 0) return;

    const progress = Math.min(1, elapsed / duration);

    // Mise à jour de la ligne
    if (lineRef.current) {
      lineMaterial.uniforms.progress.value = progress;
      lineMaterial.uniforms.opacity.value = Math.min(1, elapsed / 0.3);
    }

    // Mise à jour de l'impulsion qui voyage
    if (pulseRef.current) {
      const pulsePos = curve.getPoint(progress);
      pulseRef.current.position.copy(pulsePos);

      // Effet de pulsation
      const pulseScale = 0.02 + 0.01 * Math.sin(elapsed * 10);
      pulseRef.current.scale.setScalar(pulseScale);

      pulseMaterial.opacity = progress < 1 ? 0.9 : 0;
    }

    // Arrivée
    if (progress >= 1 && !arrived) {
      setArrived(true);
      if (onArrival) {
        onArrival({ lat: toLat, lon: toLon });
      }
    }
  });

  return (
    <group>
      {/* Ligne de route */}
      <line ref={lineRef} geometry={lineGeometry} material={lineMaterial} />

      {/* Impulsion qui voyage */}
      <mesh ref={pulseRef} material={pulseMaterial}>
        <sphereGeometry args={[0.02, 8, 8]} />
      </mesh>

      {/* Points de départ et d'arrivée */}
      <mesh position={startPos}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export default InfectionRoute;
