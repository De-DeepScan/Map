import { Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Preload } from '@react-three/drei';
import { Earth } from './Earth';
import { Clouds } from './Clouds';
import { Atmosphere } from './Atmosphere';
import { NightLights } from './NightLights';
import { InfectionSystem, InfectionOrigin } from './infection';
import { GeoJsonLayer, CountryNameDisplay, SORT_MODES } from './GeoJsonLayer';
import { HolographicRings } from './HolographicRings';
import { ScanLines } from './ScanLines';
import { OceanGridShader } from './OceanGrid';
import { CameraAnimator } from './CameraAnimator';
import { NewsTicker } from './NewsTicker';

/**
 * Composant EarthGroup (Groupe Terre)
 *
 * Regroupe tous les éléments de la planète :
 * - Terre (sphère principale avec textures)
 * - Nuages (couche transparente)
 * - Atmosphère (lueur sur les bords)
 * - Lumières nocturnes (villes du côté sombre)
 * - Système d'infection (style Plague Inc)
 * - Couche GeoJSON avec les frontières des pays
 *
 * Inclinaison de l'axe ~23.5° comme la vraie Terre
 */
function EarthGroup({ onCountrySelect, showGeoJson = true, geoJsonSettings = {} }) {
  // Position du "Soleil" pour le calcul de l'éclairage des lumières nocturnes
  const sunPosition = [5, 3, 5];

  // Paramètres par défaut pour la couche GeoJSON
  const defaultGeoJsonSettings = {
    geoJsonUrl: '/world.geojson',
    sortMode: SORT_MODES.AREA_DESC,  // Les grands pays sont rendus en premier
    interactive: true,
    useModifierKey: true,            // Alt/Option + clic pour sélectionner
    defaultColor: '#ffffff',
    selectedColor: '#00ff00',
    defaultOpacity: 0.5,
    selectedOpacity: 1.0,
    dimmedOpacity: 0.2,
    lineWidth: 1,
    rotationSpeed: 0.001,
    ...geoJsonSettings,
  };

  return (
    // Inclinaison de l'axe terrestre (23.5 degrés = 0.41 radian)
    <group rotation={[0, 0, 0.41]}>
      {/* Composants de texture de la planète (désactivés) */}
      {/* <Earth rotationSpeed={0.001} /> */}
      {/* <Clouds rotationSpeed={0.0012} /> */}
      {/* <NightLights rotationSpeed={0.001} lightPosition={sunPosition} /> */}
      {/* <Atmosphere /> */}

      {/* Grille digitale sur les océans */}
      <OceanGridShader
        color="#00ddff"
        opacity={0.25}
        gridSize={40}
        lineWidth={0.012}
        rotationSpeed={0.001}
        pulseSpeed={1.0}
        glowIntensity={1.2}
        enabled={true}
      />

      {/* Couche GeoJSON avec les frontières des pays */}
      {showGeoJson && (
        <GeoJsonLayer
          {...defaultGeoJsonSettings}
          onCountrySelect={onCountrySelect}
        />
      )}

      {/* Point d'origine de l'infection (Paris) - pulsation */}
      <InfectionOrigin
        lat={48.9}
        lon={2.3}
        color="#ff0000"
        pulseSpeed={2}
        rotationSpeed={0.001}
      />

      {/* Système d'infection Plague Inc */}
      <InfectionSystem
        autoStart={true}
        startCity="Paris"
        spreadSpeed={2}
        routeInterval={5}
        maxClusters={10}
        maxRoutes={15}
        color="#ff0000"
        rotationSpeed={0.001}
      />

      {/* Lignes de scan - effet digital (désactivé) */}
      {/* <ScanLines
        earthRadius={2}
        primaryColor="#00ffff"
        secondaryColor="#00ff88"
        enabled={true}
      /> */}
    </group>
  );
}

/**
 * Composant Lighting (Éclairage)
 *
 * Configuration de l'éclairage de la scène :
 * - Directional light = Soleil (source principale, projette des ombres)
 * - Ambient light = lumière diffuse (pour que le côté sombre ne soit pas noir)
 */
function Lighting() {
  return (
    <>
      {/*
        Directional Light - simulation du Soleil
        - intensity : luminosité de la lumière
        - position : d'où elle éclaire (droite-haut-avant)
        - castShadow : active la projection d'ombres
      */}
      <directionalLight
        intensity={1.5}
        position={[5, 3, 5]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/*
        Ambient Light - éclairage global
        Faible intensité pour voir les détails du côté sombre
      */}
      <ambientLight intensity={0.1} />

      {/*
        Hemisphere Light - simulation de la lumière réfléchie par l'espace
        Haut = bleu léger, bas = sombre
      */}
      <hemisphereLight
        args={['#b1e1ff', '#000000', 0.2]}
      />
    </>
  );
}

/**
 * Composant Scene (Scène)
 *
 * Scène 3D principale avec Canvas de @react-three/fiber
 *
 * Architecture :
 * - Canvas : conteneur du moteur de rendu WebGL
 * - Suspense : chargement asynchrone des textures
 * - OrbitControls : contrôle de la caméra à la souris
 * - Stars : fond étoilé
 * - GeoJsonLayer : couche avec les frontières des pays (tri, interactivité)
 */
export function Scene({
  showGeoJson = true,
  geoJsonSettings = {},
  onCountrySelect: externalOnCountrySelect = null,
}) {
  // État du pays sélectionné
  const [selectedCountry, setSelectedCountry] = useState(null);

  // Temps de démarrage de l'infection (pour la news ticker)
  const [infectionStartTime] = useState(() => Date.now());

  // Gestionnaire de sélection de pays
  const handleCountrySelect = useCallback((countryName) => {
    setSelectedCountry(countryName);
    if (externalOnCountrySelect) {
      externalOnCountrySelect(countryName);
    }
  }, [externalOnCountrySelect]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* UI: affichage du pays sélectionné */}
      <CountryNameDisplay selectedCountry={selectedCountry} />

      {/* Nouvelle bande d'actualités */}
      <NewsTicker startTime={infectionStartTime} isRunning={true} />

      <Canvas
        // Paramètres de la caméra (position initiale sera changée par CameraAnimator)
        camera={{
          position: [0, 0, 3.2], // Commence proche (sera animé)
          fov: 45,               // Angle de vue (field of view)
          near: 0.1,             // Plan de découpe proche
          far: 1000,             // Plan de découpe éloigné
        }}
        // Activer les ombres
        shadows
        // Paramètres du moteur de rendu WebGL
        gl={{
          antialias: true,           // Lissage des bords
          alpha: false,              // Fond opaque
          powerPreference: 'high-performance',
        }}
        // Taille du canvas = 100% du conteneur
        style={{ background: '#000010' }}
      >
        {/* Suspense pour le chargement asynchrone des textures */}
        <Suspense fallback={null}>
          {/* Animation de la caméra: zoom depuis Paris puis vue globale */}
          <CameraAnimator
            startLat={48.9}         // Paris
            startLon={2.3}
            startDistance={3.2}     // Proche au début
            endDistance={6}         // Vue globale à la fin
            duration={20000}        // 20 secondes d'animation (медленно)
            delay={1000}            // 1 секунда задержки перед началом
          />

          {/* Éclairage de la scène */}
          <Lighting />

          {/* Planète Terre avec toutes ses couches */}
          <EarthGroup
            onCountrySelect={handleCountrySelect}
            showGeoJson={showGeoJson}
            geoJsonSettings={geoJsonSettings}
          />

          {/* Anneaux holographiques de données - en dehors du groupe Terre pour une rotation indépendante */}
          <HolographicRings
            earthRadius={2}
            primaryColor="#00ffff"
            secondaryColor="#ff00ff"
            tertiaryColor="#00ff88"
          />

          {/* Fond étoilé */}
          <Stars
            radius={300}        // Rayon de la sphère d'étoiles
            depth={60}          // Profondeur de distribution
            count={20000}       // Nombre d'étoiles
            factor={7}          // Taille des étoiles
            saturation={0}      // Saturation (0 = blanches)
            fade                // Fondu sur les bords
            speed={0.5}         // Vitesse de scintillement
          />

          {/* Préchargement de toutes les textures */}
          <Preload all />
        </Suspense>

        {/*
        OrbitControls - contrôle de la caméra :
        - enableZoom : molette de la souris pour zoomer
        - enablePan : désactiver le déplacement (rotation uniquement)
        - enableDamping : ralentissement fluide au relâchement de la souris
        - dampingFactor : force d'inertie
        - rotateSpeed : vitesse de rotation de la caméra
        - minDistance/maxDistance : limites du zoom
      */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={0.5}
          minDistance={3}
          maxDistance={15}
          // Limitation de la rotation verticale (empêche de retourner la caméra)
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.8}
        />
      </Canvas>
    </div>
  );
}

export default Scene;
