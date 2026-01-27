import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS } from '../../utils/geoUtils';

/**
 * Composant InfectionOverlay
 *
 * Couche de shader qui dessine l'infection comme une tache 2D
 * qui s'étend sur la surface de la Terre (style sépia/encre)
 */
export function InfectionOverlay({
  infectionPoints = [],    // [{lat, lon, radius}]
  color = '#ff0000',
  maxPoints = 50,
  rotationSpeed = 0.001,
}) {
  const meshRef = useRef();
  const materialRef = useRef();

  // Créer le matériau shader
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(color) },
        pointCount: { value: 0 },
        // Tableau de points d'infection [lat, lon, radius, intensity]
        infectionData: { value: new Float32Array(maxPoints * 4) },
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
        uniform float time;
        uniform vec3 color;
        uniform int pointCount;
        uniform float infectionData[${maxPoints * 4}];

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        #define PI 3.14159265359

        // Convertir UV en lat/lon
        vec2 uvToLatLon(vec2 uv) {
          float lon = (uv.x - 0.5) * 360.0;
          float lat = (uv.y - 0.5) * 180.0;
          return vec2(lat, lon);
        }

        // Distance entre deux points sur la sphère (en degrés approximatifs)
        float geoDistance(vec2 p1, vec2 p2) {
          float dLat = p2.x - p1.x;
          float dLon = p2.y - p1.y;

          // Ajuster pour la courbure aux pôles
          float latFactor = cos(radians(p1.x));
          dLon *= latFactor;

          return sqrt(dLat * dLat + dLon * dLon);
        }

        // Bruit pour les bords organiques
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));

          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        // Bruit fractal pour des bords plus organiques
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 4; i++) {
            value += amplitude * noise(p);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }

        void main() {
          vec2 latLon = uvToLatLon(vUv);
          float totalInfection = 0.0;

          // Calculer l'infection totale de tous les points
          for (int i = 0; i < ${maxPoints}; i++) {
            if (i >= pointCount) break;

            int idx = i * 4;
            float pLat = infectionData[idx];
            float pLon = infectionData[idx + 1];
            float pRadius = infectionData[idx + 2];
            float pIntensity = infectionData[idx + 3];

            if (pRadius <= 0.0) continue;

            vec2 pointLatLon = vec2(pLat, pLon);
            float dist = geoDistance(latLon, pointLatLon);

            // Ajouter du bruit pour des bords organiques
            float noiseValue = fbm(latLon * 0.1 + time * 0.05);
            float noisyRadius = pRadius * (0.8 + noiseValue * 0.4);

            // Calculer l'intensité avec dégradé doux
            float infection = 1.0 - smoothstep(0.0, noisyRadius, dist);
            infection *= pIntensity;

            // Ajouter avec saturation douce
            totalInfection = max(totalInfection, infection);
          }

          // Pas d'infection = transparent
          if (totalInfection <= 0.01) {
            discard;
          }

          // Couleur avec variation d'intensité
          vec3 darkColor = color * 0.3;
          vec3 brightColor = color * 1.2;
          vec3 finalColor = mix(darkColor, brightColor, totalInfection);

          // Ajouter un effet de pulsation subtil
          float pulse = 0.9 + 0.1 * sin(time * 2.0);
          finalColor *= pulse;

          // Bords plus foncés, centre plus lumineux
          float edgeDarkening = smoothstep(0.0, 0.3, totalInfection);
          finalColor = mix(darkColor, finalColor, edgeDarkening);

          // Alpha basé sur l'intensité
          float alpha = totalInfection * 0.85;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,

      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.NormalBlending,
    });
  }, [color, maxPoints]);

  // Mettre à jour les données d'infection
  useEffect(() => {
    if (!materialRef.current) return;

    const data = new Float32Array(maxPoints * 4);

    infectionPoints.forEach((point, i) => {
      if (i >= maxPoints) return;
      const idx = i * 4;
      data[idx] = point.lat;
      data[idx + 1] = point.lon;
      data[idx + 2] = point.radius || 15;
      data[idx + 3] = point.intensity || 1;
    });

    materialRef.current.uniforms.infectionData.value = data;
    materialRef.current.uniforms.pointCount.value = Math.min(infectionPoints.length, maxPoints);
  }, [infectionPoints, maxPoints]);

  // Animation
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[EARTH_RADIUS + 0.005, 128, 64]} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

export default InfectionOverlay;
