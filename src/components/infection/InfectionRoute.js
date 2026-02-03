import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latLonToVector3, createArcBetweenPoints, EARTH_RADIUS } from '../../utils/geoUtils';

/**
 * Composant InfectionRoute
 *
 * Ligne de transmission entre deux points d'infection
 * - Arc courbe au-dessus de la surface de la Terre
 * - La ligne se dessine progressivement et reste visible
 */
export function InfectionRoute({
  fromLat,
  fromLon,
  toLat,
  toLon,
  duration = 3,           // Duree du voyage en secondes
  color = '#ff3333',
  onArrival,              // Callback a l'arrivee
  delay = 0,
}) {
  const lineRef = useRef();
  const [arrived, setArrived] = useState(false);
  const startTime = useRef(null);

  // Calculer les points de la courbe
  const points = useMemo(() => {
    const start = latLonToVector3(fromLat, fromLon, EARTH_RADIUS + 0.025);
    const end = latLonToVector3(toLat, toLon, EARTH_RADIUS + 0.025);

    // Hauteur de l'arc proportionnelle a la distance
    const distance = start.distanceTo(end);
    const arcHeight = Math.min(0.4, Math.max(0.12, distance * 0.12));

    const arc = createArcBetweenPoints(start, end, arcHeight);
    return arc.getPoints(80);
  }, [fromLat, fromLon, toLat, toLon]);

  // Materiau de la ligne - trainee qui reste visible
  const lineMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uProgress: { value: 0 },
        uOpacity: { value: 0 },
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
        uniform vec3 uColor;
        uniform float uProgress;
        uniform float uOpacity;
        varying float vProgress;

        void main() {
          // La ligne se dessine progressivement et reste visible
          float drawn = step(vProgress, uProgress);

          // Leger glow au bout de la ligne (front de progression)
          float frontGlow = smoothstep(uProgress - 0.15, uProgress, vProgress)
                          * smoothstep(uProgress + 0.02, uProgress, vProgress);

          // Intensite: plus brillant au front, stable derriere
          float intensity = drawn * (0.6 + frontGlow * 0.4);

          gl_FragColor = vec4(uColor, intensity * uOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [color]);

  // Geometrie de la ligne avec attribut de progression
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const progressArray = new Float32Array(points.length);
    for (let i = 0; i < points.length; i++) {
      progressArray[i] = i / (points.length - 1);
    }
    geometry.setAttribute('lineProgress', new THREE.BufferAttribute(progressArray, 1));

    return geometry;
  }, [points]);

  useFrame((state) => {
    if (!startTime.current) {
      startTime.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTime.current - delay;

    if (elapsed < 0) return;

    // Progression lineaire
    const progress = Math.min(1, elapsed / duration);

    // Mise a jour de la ligne
    if (lineRef.current) {
      lineMaterial.uniforms.uProgress.value = progress;
      // Fade in rapide au debut
      lineMaterial.uniforms.uOpacity.value = Math.min(1, elapsed / 0.3);
    }

    // Arrivee
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
    </group>
  );
}

export default InfectionRoute;
