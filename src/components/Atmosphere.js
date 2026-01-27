import { useRef, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Composant Atmosphere (Atmosphère)
 *
 * Crée un effet de lueur atmosphérique (glow) autour de la Terre
 * Utilise un shader personnalisé pour l'effet de Fresnel :
 * - Les bords de la planète brillent en bleu (diffusion de la lumière dans l'atmosphère)
 * - Le centre est transparent
 *
 * Inspiré par : exemples three.js (earth atmosphere),
 * et tutoriels sur la création de planètes réalistes
 */
export function Atmosphere() {
  const atmosphereRef = useRef();

  // Matériau shader personnalisé pour la lueur atmosphérique
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      // Vertex shader - détermine la position des sommets
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,

      // Fragment shader - détermine la couleur des pixels
      // Effet de Fresnel : l'intensité dépend de l'angle de vue
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // Vecteur de la caméra vers le point de surface
          vec3 viewDirection = normalize(-vPosition);

          // Effet de Fresnel : produit scalaire de la normale et de la direction du regard
          // Sur les bords (angle ~90°) = lueur brillante
          // Au centre (angle ~0°) = transparent
          float intensity = pow(0.7 - dot(vNormal, viewDirection), 2.0);

          // Couleur bleue de l'atmosphère terrestre
          vec3 atmosphereColor = vec3(0.3, 0.6, 1.0);

          gl_FragColor = vec4(atmosphereColor, intensity * 0.5);
        }
      `,

      // Paramètres du matériau
      blending: THREE.AdditiveBlending, // Mélange additif pour la lueur
      side: THREE.BackSide,              // Rendre la face intérieure de la sphère
      transparent: true,                  // Activer la transparence
      depthWrite: false,                  // Rendu correct
    });
  }, []);

  return (
    <mesh ref={atmosphereRef} material={atmosphereMaterial}>
      {/*
        Rayon plus grand que la Terre (2.3 vs 2.0)
        Crée un halo autour de la planète
      */}
      <sphereGeometry args={[2.3, 64, 64]} />
    </mesh>
  );
}

export default Atmosphere;
