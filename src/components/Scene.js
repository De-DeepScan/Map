import { Suspense, useState, useCallback, useEffect, memo, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Preload } from '@react-three/drei';
import { CountryInfectionSystem, InfectionOrigin } from './infection';
import { GeoJsonLayer, CountryNameDisplay, SORT_MODES } from './GeoJsonLayer';
import { HolographicRings } from './HolographicRings';
import { OceanGridShader } from './OceanGrid';
import { BaseEarthSphere } from './BaseEarthSphere';
import { CameraAnimator } from './CameraAnimator';
import { NewsTicker } from './NewsTicker';
import { InfectionHUD } from './InfectionHUD';
import { HandTrackingOverlay } from './HandTrackingOverlay';
import { HandRotationController } from './HandRotationController';

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
const EarthGroup = memo(function EarthGroup({ onCountrySelect, showGeoJson = true, geoJsonSettings = {}, onStatsUpdate, startAnimation = true, totalInfectionTime = 300000, triggerRegression = false, onRegressionComplete }) {
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
      {/* Sphère de base */}
      <BaseEarthSphere
        color="#0a0a15"
        opacity={0.3}
        rotationSpeed={0.001}
        enabled={true}
      />

      {/* Grille digitale sur les océans - optimisée */}
      <OceanGridShader
        color="#00ddff"
        opacity={0.25}
        gridSize={25}
        lineWidth={0.015}
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

      {/* Система заражения по странам (в пределах границ) */}
      {/* 15 минут - заражение замедлено */}
      <CountryInfectionSystem
        autoStart={startAnimation}
        startCountry="France"
        spreadInterval={3600}       // 3.6 секунды между волнами (3x plus lent)
        infectionDuration={4500}    // 4.5 секунды на заполнение страны (3x plus lent)
        color="#ff0000"
        rotationSpeed={0.001}
        onStatsUpdate={onStatsUpdate}
        triggerRegression={triggerRegression}
        onRegressionComplete={onRegressionComplete}
      />
    </group>
  );
});

/**
 * Composant Lighting (Éclairage)
 *
 * Configuration de l'éclairage de la scène :
 * - Directional light = Soleil (source principale, projette des ombres)
 * - Ambient light = lumière diffuse (pour que le côté sombre ne soit pas noir)
 */
const Lighting = memo(function Lighting() {
  return (
    <>
      {/*
        Directional Light - simulation du Soleil
        - intensity : luminosité de la lumière
        - position : d'où elle éclaire (droite-haut-avant)
        - Shadow mapping désactivé pour optimiser les performances (-16 MB GPU)
      */}
      <directionalLight
        intensity={1.5}
        position={[5, 3, 5]}
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
});

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
  startAnimation = true,
  onInfectionComplete = null,
  totalInfectionTime = 300000,
  enableHandTracking = true,
  triggerRegression = false,
  onRegressionComplete = null,
}) {
  // État du pays sélectionné
  const [selectedCountry, setSelectedCountry] = useState(null);

  // Hand tracking - rotation delta
  const [handRotationDelta, setHandRotationDelta] = useState(0);
  const earthGroupRef = useRef();

  // Temps de démarrage de l'infection (обновляется когда startAnimation становится true)
  const [infectionStartTime, setInfectionStartTime] = useState(null);

  // Chargement différé des éléments non essentiels (anneaux holographiques)
  const [showDecorations, setShowDecorations] = useState(false);

  // Запускаем таймер когда анимация начинается
  useEffect(() => {
    if (startAnimation && !infectionStartTime) {
      setInfectionStartTime(Date.now());
      // Charger les décorations après 1.5s pour accélérer l'affichage initial
      setTimeout(() => setShowDecorations(true), 1500);
    }
  }, [startAnimation, infectionStartTime]);

  // Статистика заражения для HUD
  const [infectionStats, setInfectionStats] = useState({ infected: 0, total: 200 });

  // Mémoïser geoJsonSettings pour éviter de recréer l'objet à chaque render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedGeoJsonSettings = useMemo(() => geoJsonSettings, [
    geoJsonSettings.geoJsonUrl,
    geoJsonSettings.sortMode,
    geoJsonSettings.interactive,
    geoJsonSettings.useModifierKey,
    geoJsonSettings.defaultColor,
    geoJsonSettings.selectedColor,
    geoJsonSettings.defaultOpacity,
    geoJsonSettings.selectedOpacity,
    geoJsonSettings.dimmedOpacity,
    geoJsonSettings.lineWidth,
    geoJsonSettings.rotationSpeed,
  ]);

  // Обработчик обновления статистики
  const handleStatsUpdate = useCallback((stats) => {
    setInfectionStats(stats);
    // Если все страны заражены - вызываем callback
    if (stats.infected > 0 && stats.infected >= stats.total && onInfectionComplete) {
      onInfectionComplete();
    }
  }, [onInfectionComplete]);

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

      {/* HUD прогресса заражения - показывается после intro */}
      {startAnimation && (
        <InfectionHUD
          startTime={infectionStartTime}
          totalCountries={infectionStats.total}
          infectedCountries={infectionStats.infected}
        />
      )}

      {/* Nouvelle bande d'actualités - показывается после intro */}
      {startAnimation && (
        <NewsTicker startTime={infectionStartTime} isRunning={true} />
      )}

      {/* Hand tracking overlay - toujours actif */}
      {enableHandTracking && (
        <HandTrackingOverlay
          enabled={enableHandTracking}
          onRotationChange={setHandRotationDelta}
          sensitivity={2.5}
        />
      )}

      <Canvas
        // Paramètres de la caméra (position initiale sera changée par CameraAnimator)
        camera={{
          position: [0, 0, 6], // Commence loin (vue globale)
          fov: 45,              // Angle de vue (field of view)
          near: 0.1,            // Plan de découpe proche
          far: 1000,            // Plan de découpe éloigné
        }}
        // Shadows désactivés pour optimiser les performances
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
            startLat={30}           // France (latitude)
            startLon={-178}         // France (longitude corrigée)
            startDistance={3.5}     // Proche de la France
            endDistance={6}         // Vue finale après animation
            duration={15000}        // 15 secondes d'animation
            delay={300}             // Petite pause avant zoom
            enabled={startAnimation}
          />

          {/* Éclairage de la scène */}
          <Lighting />

          {/* Controleur de rotation par gestes de la main */}
          <HandRotationController
            targetRef={earthGroupRef}
            rotationDelta={handRotationDelta}
            enabled={enableHandTracking}
          />

          {/* Planète Terre avec toutes ses couches */}
          <group ref={earthGroupRef}>
            <EarthGroup
              onCountrySelect={handleCountrySelect}
              showGeoJson={showGeoJson}
              geoJsonSettings={memoizedGeoJsonSettings}
              onStatsUpdate={handleStatsUpdate}
              startAnimation={startAnimation}
              totalInfectionTime={totalInfectionTime}
              triggerRegression={triggerRegression}
              onRegressionComplete={onRegressionComplete}
            />
          </group>

          {/* Anneaux holographiques de données - chargement différé pour performance */}
          {showDecorations && (
            <HolographicRings
              earthRadius={2}
              primaryColor="#00ffff"
              secondaryColor="#ff00ff"
              tertiaryColor="#00ff88"
            />
          )}

          {/* Fond étoilé - optimisé à 5k étoiles pour chargement rapide */}
          <Stars
            radius={300}        // Rayon de la sphère d'étoiles
            depth={50}          // Profondeur de distribution
            count={5000}        // Nombre d'étoiles (réduit pour performance)
            factor={6}          // Taille des étoiles
            saturation={0}      // Saturation (0 = blanches)
            fade                // Fondu sur les bords
            speed={0.3}         // Vitesse de scintillement
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
