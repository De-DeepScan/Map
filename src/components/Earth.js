import { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

/**
 * Composant Earth (Terre)
 *
 * Composant principal de la planète Terre avec textures :
 * - Diffuse map (carte de couleur de la surface)
 * - Bump/Normal map (carte de relief pour créer un effet 3D)
 * - Specular map (carte de réflexion - les océans brillent, la terre est mate)
 *
 * Textures : NASA Blue Marble / Solar System Scope (domaine public)
 */
export function Earth({ rotationSpeed = 0.001 }) {
  const earthRef = useRef();

  // Chargement des textures
  // Utilisation de TextureLoader de Three.js via le hook useLoader
  const [colorMap, bumpMap, specularMap, normalMap] = useLoader(TextureLoader, [
    '/textures/earth_daymap.jpg',      // Carte diurne de la Terre
    '/textures/earth_bump.jpg',         // Carte des hauteurs pour le relief
    '/textures/earth_specular.jpg',     // Carte de réflexion (océans/terre)
    '/textures/earth_normal.jpg',       // Normal map pour les détails
  ]);

  // Animation de rotation de la planète
  // useFrame est appelé à chaque frame (~60 fps)
  useFrame((state, delta) => {
    if (earthRef.current) {
      // Rotation autour de l'axe Y (comme la vraie Terre)
      // delta assure la fluidité indépendamment des fps
      earthRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <mesh ref={earthRef} castShadow receiveShadow>
      {/*
        Sphère avec haute définition :
        - args: [rayon, segmentsLargeur, segmentsHauteur]
        - Plus de segments = sphère plus lisse
      */}
      <sphereGeometry args={[2, 64, 64]} />

      {/*
        MeshPhongMaterial - matériau avec support d'éclairage et réflexions
        Alternatives :
        - MeshStandardMaterial (PBR, plus réaliste)
        - MeshPhysicalMaterial (PBR encore plus avancé)
      */}
      <meshPhongMaterial
        map={colorMap}                    // Texture principale de couleur
        bumpMap={bumpMap}                 // Carte de relief
        bumpScale={0.05}                  // Intensité du relief
        specularMap={specularMap}         // Où ça brille (océans)
        specular={new THREE.Color(0x333333)} // Couleur du reflet
        shininess={25}                    // Intensité de la brillance
        normalMap={normalMap}             // Détails de surface
        normalScale={new THREE.Vector2(0.5, 0.5)}
      />
    </mesh>
  );
}

export default Earth;
