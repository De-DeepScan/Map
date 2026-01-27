import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

/**
 * Composant NightLights (Lumières nocturnes)
 *
 * Lumières nocturnes des villes sur le côté sombre de la Terre :
 * - Utilise la texture des lumières nocturnes de la NASA
 * - Un shader personnalisé affiche les lumières uniquement du côté non éclairé
 * - Synchronisé avec la rotation de la Terre principale
 */
export function NightLights({ rotationSpeed = 0.001, lightPosition = [5, 3, 5] }) {
  const nightRef = useRef();

  const nightMap = useLoader(TextureLoader, '/textures/earth_nightmap.jpg');

  // Shader personnalisé pour les lumières nocturnes
  const nightMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        nightTexture: { value: nightMap },
        sunDirection: { value: new THREE.Vector3(...lightPosition).normalize() },
      },

      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,

      fragmentShader: `
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          // Calculer l'éclairage : produit scalaire de la normale et de la direction du soleil
          vec3 worldNormal = normalize(vNormal);
          float sunIntensity = dot(worldNormal, sunDirection);

          // Les lumières nocturnes ne sont visibles que du côté sombre
          // smoothstep crée une transition douce jour/nuit
          float nightIntensity = smoothstep(0.0, -0.2, sunIntensity);

          vec4 nightColor = texture2D(nightTexture, vUv);

          // Augmenter la luminosité des lumières
          gl_FragColor = vec4(nightColor.rgb * nightIntensity * 1.5, nightIntensity * nightColor.r);
        }
      `,

      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [nightMap, lightPosition]);

  useFrame(() => {
    if (nightRef.current) {
      nightRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <mesh ref={nightRef} material={nightMaterial}>
      <sphereGeometry args={[2.005, 64, 64]} />
    </mesh>
  );
}

export default NightLights;
