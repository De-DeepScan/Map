
import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS, subdivideRing } from '../utils/geoUtils';
import { useGeoJson } from '../context/GeoJsonContext';

/**
 * GeoJsonLayer - Couche de rendu des pays à partir de GeoJSON
 *
 * Fonctionnalités:
 * - Chargement et rendu des données GeoJSON
 * - Tri des pays (par nom, superficie ou personnalisé)
 * - Sélection interactive des pays (Alt/Option + clic)
 * - Contrôle de l'ordre de rendu via renderOrder et depthTest
 *
 * Adapté de: https://github.com/NombanaMtechniix/geo-globe-three
 */

// ============================================
// PARAMÈTRES DE TRI
// ============================================
export const SORT_MODES = {
  NONE: 'none',           // Ordre tel que dans le GeoJSON
  NAME_ASC: 'name_asc',   // Par nom A-Z
  NAME_DESC: 'name_desc', // Par nom Z-A
  AREA_ASC: 'area_asc',   // Par superficie (les plus petits en premier)
  AREA_DESC: 'area_desc', // Par superficie (les plus grands en premier - recommandé)
  CUSTOM: 'custom',       // Fonction de tri personnalisée
};

/**
 * Détecte si un anneau de coordonnées traverse l'antiméridien (±180°)
 */
function ringCrossesAntimeridian(ring) {
  for (let i = 0; i < ring.length - 1; i++) {
    const lon1 = ring[i][0];
    const lon2 = ring[i + 1][0];
    const dLon = Math.abs(lon2 - lon1);
    if (dLon > 180) {
      return true;
    }
  }
  return false;
}

/**
 * Calcul approximatif de la superficie du polygone (pour le tri)
 */
function calculateApproximateArea(coordinates) {
  if (!coordinates || coordinates.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    area += coordinates[i][0] * coordinates[j][1];
    area -= coordinates[j][0] * coordinates[i][1];
  }
  return Math.abs(area / 2);
}

/**
 * Fonctions de tri
 */
const sortFunctions = {
  [SORT_MODES.NONE]: null,
  [SORT_MODES.NAME_ASC]: (a, b) => {
    const nameA = a.properties?.name || a.properties?.admin || '';
    const nameB = b.properties?.name || b.properties?.admin || '';
    return nameA.localeCompare(nameB);
  },
  [SORT_MODES.NAME_DESC]: (a, b) => {
    const nameA = a.properties?.name || a.properties?.admin || '';
    const nameB = b.properties?.name || b.properties?.admin || '';
    return nameB.localeCompare(nameA);
  },
  [SORT_MODES.AREA_ASC]: (a, b) => {
    const getArea = (feature) => {
      const coords = feature.geometry?.coordinates;
      if (!coords) return 0;
      if (feature.geometry.type === 'Polygon') {
        return calculateApproximateArea(coords[0]);
      } else if (feature.geometry.type === 'MultiPolygon') {
        return coords.reduce((sum, poly) => sum + calculateApproximateArea(poly[0]), 0);
      }
      return 0;
    };
    return getArea(a) - getArea(b);
  },
  [SORT_MODES.AREA_DESC]: (a, b) => {
    const getArea = (feature) => {
      const coords = feature.geometry?.coordinates;
      if (!coords) return 0;
      if (feature.geometry.type === 'Polygon') {
        return calculateApproximateArea(coords[0]);
      } else if (feature.geometry.type === 'MultiPolygon') {
        return coords.reduce((sum, poly) => sum + calculateApproximateArea(poly[0]), 0);
      }
      return 0;
    };
    return getArea(b) - getArea(a);
  },
};

// ============================================
// COMPOSANT MESH DU PAYS
// ============================================
const CountryMesh = memo(({
  countryName,
  ring,
  featureIndex,
  isSelected,
  hasSelection,
  isInteractive,
  onCountryClick,
  // Paramètres visuels
  defaultColor,
  selectedColor,
  defaultOpacity,
  selectedOpacity,
  dimmedOpacity,
  lineWidth,
  // Paramètres de rendu
  renderOrderBase,
  selectedRenderOrder,
}) => {
  const radius = EARTH_RADIUS + 0.01; // Légèrement au-dessus de la surface de la Terre
  const lineRef = useRef();
  const materialRef = useRef();

  // Géométrie de la ligne de frontière - AMÉLIORÉE avec subdivision pour suivre la courbure
  const lineGeometry = useMemo(() => {
    // Subdiviser le ring pour qu'il suive la courbure de la Terre
    const subdividedRing = subdivideRing(ring, radius, 5);  // Max 5° par segment

    const points = [];
    subdividedRing.forEach(([lon, lat]) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const x = -radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      points.push(new THREE.Vector3(x, y, z));
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [ring, radius]);

  // Géométrie du polygone rempli (pour le clic) - création stable
  const filledGeometry = useMemo(() => {
    const points = [];
    ring.forEach(([lon, lat]) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const x = -radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      points.push(new THREE.Vector3(x, y, z));
    });

    if (points.length < 3) return null;

    const vertices = [];
    const indices = [];

    points.forEach((point) => {
      vertices.push(point.x, point.y, point.z);
    });

    // Triangulation en éventail
    for (let i = 1; i < points.length - 1; i++) {
      indices.push(0, i, i + 1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    return geometry;
  }, [ring, radius]);

  // Créer le material et le line object une seule fois
  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: defaultColor,
      transparent: true,
      opacity: defaultOpacity,
      linewidth: lineWidth,
      depthTest: true,
      depthWrite: true,
    });
  }, [defaultColor, defaultOpacity, lineWidth]);

  const lineObject = useMemo(() => {
    return new THREE.Line(lineGeometry, lineMaterial);
  }, [lineGeometry, lineMaterial]);

  // Mettre à jour les propriétés du material au lieu de le recréer
  useEffect(() => {
    if (materialRef.current || lineMaterial) {
      const mat = materialRef.current || lineMaterial;
      const currentColor = isSelected ? selectedColor : defaultColor;
      const currentOpacity = isSelected
        ? selectedOpacity
        : hasSelection
          ? dimmedOpacity
          : defaultOpacity;

      mat.color.set(currentColor);
      mat.opacity = currentOpacity;
      mat.linewidth = isSelected ? lineWidth * 2 : lineWidth;
      mat.depthTest = !isSelected;
      mat.depthWrite = !isSelected;
      mat.needsUpdate = true;
    }
  }, [isSelected, hasSelection, selectedColor, defaultColor, selectedOpacity, dimmedOpacity, defaultOpacity, lineWidth, lineMaterial]);

  // Cleanup: disposer les géométries et matériaux au unmount
  useEffect(() => {
    return () => {
      if (lineGeometry) lineGeometry.dispose();
      if (filledGeometry) filledGeometry.dispose();
      if (lineMaterial) lineMaterial.dispose();
    };
  }, [lineGeometry, filledGeometry, lineMaterial]);

  // Gestionnaire de clic
  const handleClick = useCallback((e) => {
    if (!isInteractive) return;
    e.stopPropagation();
    onCountryClick(isSelected ? null : countryName);
  }, [isInteractive, isSelected, countryName, onCountryClick]);

  // Stocker la référence au material
  useEffect(() => {
    materialRef.current = lineMaterial;
  }, [lineMaterial]);

  // Stocker la référence au line object
  useEffect(() => {
    lineRef.current = lineObject;
  }, [lineObject]);

  if (!lineGeometry || lineGeometry.attributes.position.count < 3) {
    return null;
  }

  // Ordre de rendu: les pays sélectionnés sont dessinés au-dessus
  const currentRenderOrder = isSelected ? selectedRenderOrder : renderOrderBase + featureIndex;

  return (
    <group>
      {/* Mesh invisible pour la gestion des clics */}
      {filledGeometry && isInteractive && (
        <mesh
          geometry={filledGeometry}
          onClick={handleClick}
          renderOrder={currentRenderOrder}
        >
          <meshBasicMaterial
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthTest={true}
          />
        </mesh>
      )}

      {/* Ligne de frontière visible - utilise l'objet mémoïsé */}
      <primitive
        object={lineObject}
        renderOrder={currentRenderOrder}
      />

      {/* Remplissage du pays sélectionné */}
      {isSelected && filledGeometry && (
        <mesh
          geometry={filledGeometry}
          renderOrder={currentRenderOrder - 1}
        >
          <meshBasicMaterial
            color={selectedColor}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      )}
    </group>
  );
});

CountryMesh.displayName = 'CountryMesh';

// ============================================
// COMPOSANT PRINCIPAL GEOJSONLAYER
// ============================================
export function GeoJsonLayer({
  // Source de données
  geoJsonUrl = '/world.geojson',
  geoJsonData = null, // Alternative: passer les données directement

  // Tri
  sortMode = SORT_MODES.AREA_DESC, // Les grands pays sont rendus en premier (en dessous)
  customSortFn = null, // Fonction (a, b) => number pour SORT_MODES.CUSTOM

  // Interactivité
  interactive = true,
  useModifierKey = true, // Exiger Alt/Option pour la sélection
  onCountrySelect = null, // Callback lors de la sélection d'un pays

  // Paramètres visuels
  defaultColor = '#ffffff',
  selectedColor = '#00ff00',
  defaultOpacity = 0.7,
  selectedOpacity = 1.0,
  dimmedOpacity = 0.3,
  lineWidth = 1,

  // Paramètres de rendu
  renderOrderBase = 10,
  selectedRenderOrder = 1000,

  // Rotation avec la Terre
  rotationSpeed = 0.001,
}) {
  const groupRef = useRef();
  const { geoData: contextGeoData } = useGeoJson();
  const [geoData, setGeoData] = useState(geoJsonData);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [isModifierPressed, setIsModifierPressed] = useState(false);

  // Chargement du GeoJSON s'il n'est pas passé directement
  useEffect(() => {
    if (geoJsonData) {
      setGeoData(geoJsonData);
      return;
    }

    // Utiliser les données du Context au lieu de fetch
    if (contextGeoData) {
      setGeoData(contextGeoData);
    }
  }, [geoJsonData, contextGeoData]);

  // Suivi du modificateur (Alt/Option)
  useEffect(() => {
    if (!useModifierKey) {
      setIsModifierPressed(true);
      return;
    }

    const handleKeyDown = (event) => {
      if (event.altKey || event.metaKey) {
        setIsModifierPressed(true);
      }
    };

    const handleKeyUp = (event) => {
      if (!event.altKey && !event.metaKey) {
        setIsModifierPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [useModifierKey]);

  // Rotation avec la Terre
  useFrame(() => {
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed;
    }
  });

  // Gestionnaire de sélection du pays
  const handleCountryClick = useCallback((countryName) => {
    setSelectedCountry(countryName);
    if (onCountrySelect) {
      onCountrySelect(countryName);
    }
  }, [onCountrySelect]);

  // Tri et création des meshes des pays
  const countryMeshes = useMemo(() => {
    if (!geoData || !geoData.features) return null;

    // Application du tri
    let features = [...geoData.features];

    if (sortMode === SORT_MODES.CUSTOM && customSortFn) {
      features.sort(customSortFn);
    } else if (sortMode !== SORT_MODES.NONE && sortFunctions[sortMode]) {
      features.sort(sortFunctions[sortMode]);
    }

    const meshes = [];

    features.forEach((feature, featureIndex) => {
      const { geometry, properties } = feature;
      const countryName = properties?.name || properties?.admin || `Country ${featureIndex}`;

      let coordinateArrays = [];

      if (geometry.type === 'Polygon') {
        coordinateArrays = geometry.coordinates;
      } else if (geometry.type === 'MultiPolygon') {
        coordinateArrays = geometry.coordinates.flat();
      }

      coordinateArrays.forEach((ring, ringIndex) => {
        // Ignorer les anneaux qui traversent l'antiméridien (évite les lignes verticales)
        if (ring.length > 2 && !ringCrossesAntimeridian(ring)) {
          const isSelected = selectedCountry === countryName;
          const hasSelection = selectedCountry !== null;

          meshes.push(
            <CountryMesh
              key={`country-${featureIndex}-${ringIndex}`}
              countryName={countryName}
              ring={ring}
              featureIndex={featureIndex}
              isSelected={isSelected}
              hasSelection={hasSelection}
              isInteractive={interactive && isModifierPressed}
              onCountryClick={handleCountryClick}
              defaultColor={defaultColor}
              selectedColor={selectedColor}
              defaultOpacity={defaultOpacity}
              selectedOpacity={selectedOpacity}
              dimmedOpacity={dimmedOpacity}
              lineWidth={lineWidth}
              renderOrderBase={renderOrderBase}
              selectedRenderOrder={selectedRenderOrder}
            />
          );
        }
      });
    });

    return meshes;
  }, [
    geoData,
    sortMode,
    customSortFn,
    selectedCountry,
    interactive,
    isModifierPressed,
    handleCountryClick,
    defaultColor,
    selectedColor,
    defaultOpacity,
    selectedOpacity,
    dimmedOpacity,
    lineWidth,
    renderOrderBase,
    selectedRenderOrder,
  ]);

  return (
    <group ref={groupRef}>
      {countryMeshes}
    </group>
  );
}

// ============================================
// COMPOSANT UI POUR AFFICHER LE PAYS SÉLECTIONNÉ
// ============================================
export const CountryNameDisplay = memo(({ selectedCountry, style = {} }) => {
  if (!selectedCountry) return null;

  const defaultStyle = {
    position: 'absolute',
    top: '24px',
    left: '24px',
    zIndex: 30,
    padding: '8px 16px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(0, 255, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    color: '#00ff00',
    fontFamily: 'monospace',
    fontSize: '18px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  };

  return (
    <div style={{ ...defaultStyle, ...style }}>
      {selectedCountry}
    </div>
  );
});

CountryNameDisplay.displayName = 'CountryNameDisplay';

export default GeoJsonLayer;
