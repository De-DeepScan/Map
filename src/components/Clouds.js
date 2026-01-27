import { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

/**
 * Composant Clouds (Nuages)
 *
 * Couche de nuages au-dessus de la Terre :
 * - Rayon légèrement plus grand que celui de la Terre
 * - Matériau transparent avec texture de nuages
 * - Tourne un peu plus vite que la Terre (différentes couches atmosphériques)
 */
export function Clouds({ rotationSpeed = 0.0012 }) {
  const cloudsRef = useRef();

  // Chargement de la texture des nuages (noir et blanc, blanc = nuages)
  const cloudsMap = useLoader(TextureLoader, '/textures/earth_clouds.png');

  // Rotation des nuages (un peu plus rapide que la Terre pour le réalisme)
  useFrame(() => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <mesh ref={cloudsRef}>
      {/*
        Rayon légèrement plus grand que la Terre (2.01 vs 2.0)
        Cela crée l'effet d'une couche atmosphérique
      */}
      <sphereGeometry args={[2.01, 64, 64]} />

      {/*
        MeshPhongMaterial avec transparence :
        - transparent: true — active le canal alpha
        - opacity: 0.4 — transparence globale de la couche
        - alphaMap: la texture détermine la transparence par pixel
        - depthWrite: false — rendu correct des objets transparents
      */}
      <meshPhongMaterial
        map={cloudsMap}
        transparent={true}
        opacity={0.4}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default Clouds;
