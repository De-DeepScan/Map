import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS, subdivideRing } from '../../utils/geoUtils';
import { useGeoJson } from '../../context/GeoJsonContext';

/**
 * CountryInfectionLayer
 *
 * SHADER-BASED APPROACH:
 * - Génère une texture ID qui mappe lat/lon → country ID
 * - Utilise un shader pour colorer chaque pixel selon son pays
 * - Parfaitement aligné sur la sphère (pas de triangles plats)
 */

// Bordures des pays (lignes blanches)
const CountryBorder = memo(({ borderGeometry }) => {
  if (!borderGeometry) return null;

  return (
    <line geometry={borderGeometry} renderOrder={2}>
      <lineBasicMaterial
        color="#ffffff"
        transparent={true}
        opacity={0.6}
        linewidth={1}
        depthTest={true}
        depthWrite={false}
      />
    </line>
  );
});

CountryBorder.displayName = 'CountryBorder';

/**
 * Конвертация lat/lon в 3D координаты
 */
function latLonTo3D(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

/**
 * Détecte si un anneau de coordonnées traverse l'antiméridien (±180°)
 * Un anneau traverse l'antiméridien si deux points consécutifs ont une différence de longitude > 180°
 */
function ringCrossesAntimeridian(ring) {
  for (let i = 0; i < ring.length - 1; i++) {
    const lon1 = ring[i][0];
    const lon2 = ring[i + 1][0];
    const dLon = Math.abs(lon2 - lon1);
    // Si la différence de longitude est > 180°, c'est un saut d'antiméridien
    if (dLon > 180) {
      return true;
    }
  }
  return false;
}

/**
 * Crée une géométrie de bordure pour un pays
 * Ignore les anneaux qui traversent l'antiméridien pour éviter les lignes verticales
 */
function createBorderGeometry(coordinates, radius) {
  if (coordinates.length < 3) return null;

  // CORRECTION: Ignorer les anneaux qui traversent l'antiméridien
  if (ringCrossesAntimeridian(coordinates)) {
    return null;
  }

  const subdividedCoords = subdivideRing(coordinates, radius, 5);
  const borderPoints = subdividedCoords.map(([lon, lat]) => {
    const { x, y, z } = latLonTo3D(lat, lon, radius);
    return new THREE.Vector3(x, y, z);
  });

  return new THREE.BufferGeometry().setFromPoints(borderPoints);
}

/**
 * Test point-in-polygon (raycasting algorithm)
 * Retourne true si le point (lon, lat) est dans le polygone
 */
function pointInPolygon(lon, lat, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > lat) !== (yj > lat)) &&
                      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Génère une texture qui mappe chaque pixel (lat/lon) à un ID de pays
 * Résolution: 4096x2048 (équirectangulaire) - haute résolution pour bords lisses
 * Retourne: { texture, countryIdMap }
 */
function generateCountryIdTexture(geoData) {
  const width = 4096;
  const height = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fond noir (ID 0 = pas de pays)
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  // Map country name -> ID
  const countryIdMap = new Map();
  let currentId = 1;

  // Pour chaque pays, assigner un ID et remplir la texture
  geoData.features.forEach((feature) => {
    const countryName = feature.properties?.name || feature.properties?.admin;
    if (!countryName) return;

    // Assigner un ID unique au pays (1-255)
    if (!countryIdMap.has(countryName)) {
      countryIdMap.set(countryName, currentId);
      currentId++;
      if (currentId > 255) currentId = 255; // Max 255 pays
    }

    const countryId = countryIdMap.get(countryName);

    // Couleur = ID encodé en grayscale
    const color = `rgb(${countryId}, ${countryId}, ${countryId})`;
    ctx.fillStyle = color;

    const { geometry } = feature;
    let polygons = [];

    if (geometry.type === 'Polygon') {
      polygons = [geometry.coordinates[0]]; // Premier ring (outer)
    } else if (geometry.type === 'MultiPolygon') {
      polygons = geometry.coordinates.map(poly => poly[0]);
    }

    // Pour chaque polygone du pays
    polygons.forEach(polygon => {
      if (polygon.length < 3) return;

      // Dessiner le polygone pixel par pixel
      // (Approche simple: scanner chaque pixel de la bbox)
      const lons = polygon.map(p => p[0]);
      const lats = polygon.map(p => p[1]);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);

      // CORRECTION: Ignorer les polygones qui traversent l'antiméridien (±180°)
      // On détecte uniquement les SEGMENTS qui sautent de +180 à -180 (ou vice versa)
      // Note: on ne filtre PAS basé sur la bbox car l'Antarctique a une grande bbox
      // mais ne traverse pas réellement l'antiméridien (il entoure le pôle Sud)
      const hasAntimeridianJump = polygon.some((coord, i) => {
        if (i === 0) return false;
        const dLon = Math.abs(coord[0] - polygon[i - 1][0]);
        return dLon > 180;
      });

      if (hasAntimeridianJump) {
        // Skip silencieusement - c'est normal pour certains pays (Russie, USA/Alaska, Fidji, etc.)
        return;
      }

      // Convertir lat/lon bbox en pixel bbox
      const xMin = Math.floor(((minLon + 180) / 360) * width);
      const xMax = Math.ceil(((maxLon + 180) / 360) * width);
      const yMin = Math.floor(((90 - maxLat) / 180) * height);
      const yMax = Math.ceil(((90 - minLat) / 180) * height);

      // Scanner les pixels dans la bbox
      for (let y = Math.max(0, yMin); y < Math.min(height, yMax); y++) {
        for (let x = Math.max(0, xMin); x < Math.min(width, xMax); x++) {
          // Convertir pixel en lat/lon
          const lon = (x / width) * 360 - 180;
          const lat = 90 - (y / height) * 180;

          // Test si dans le polygone
          if (pointInPolygon(lon, lat, polygon)) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });
  });

  // Créer la texture THREE.js depuis le canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping; // Évite la ligne verticale à ±180°
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  console.log(`Country ID texture generated: ${countryIdMap.size} countries`);

  return { texture, countryIdMap };
}

/**
 * Shader Material pour le rendu des pays avec infection
 */
function createCountryShaderMaterial(countryIdTexture, infectionData, infectedColor) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCountryIdTexture: { value: countryIdTexture },
      uInfectionData: { value: infectionData }, // Float32Array: [id1, progress1, id2, progress2, ...]
      uInfectedColor: { value: new THREE.Color(infectedColor) },
      uBlackColor: { value: new THREE.Color('#000000') },
    },
    vertexShader: `
      varying vec3 vPosition;

      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uCountryIdTexture;
      uniform float uInfectionData[512]; // Max 256 pays × 2 (id, progress)
      uniform vec3 uInfectedColor;
      uniform vec3 uBlackColor;

      varying vec3 vPosition;

      // Constante PI
      const float PI = 3.14159265359;

      void main() {
        // SOLUTION COUTURE: Calculer les UV directement dans le fragment shader
        // Cela évite le problème d'interpolation incorrecte à la couture de texture
        vec3 normalized = normalize(vPosition);

        // Latitude: asin(y) donne [-π/2, π/2]
        float lat = asin(clamp(normalized.y, -1.0, 1.0));

        // Longitude: atan(-z, x) donne [-π, π]
        float lon = atan(-normalized.z, normalized.x);

        // Convertir en coordonnées UV [0, 1]
        vec2 uv;
        uv.x = (lon / PI + 1.0) * 0.5;  // Longitude: [-π, π] → [0, 1]
        uv.y = 0.5 + (lat / PI);         // Latitude: [-π/2, π/2] → [0, 1]

        // Filtrer les pixels très proches de l'antiméridien (bords U=0 et U=1)
        float edgeThreshold = 0.002;
        if (uv.x < edgeThreshold || uv.x > (1.0 - edgeThreshold)) {
          discard;
        }

        // Lire l'ID du pays depuis la texture
        vec4 idColor = texture2D(uCountryIdTexture, uv);
        float countryId = idColor.r * 255.0;

        // Si pas de pays (ID = 0), discard
        if (countryId < 0.5) {
          discard;
        }

        // Chercher la progression d'infection pour ce pays
        float infectionProgress = 0.0;
        for (int i = 0; i < 256; i++) {
          if (uInfectionData[i * 2] == countryId) {
            infectionProgress = uInfectionData[i * 2 + 1];
            break;
          }
          // Optimisation: arrêter si on trouve un ID vide
          if (uInfectionData[i * 2] == 0.0) break;
        }

        // Interpoler entre noir et rouge selon la progression
        vec3 color = mix(uBlackColor, uInfectedColor, infectionProgress);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true,
  });
}

/**
 * Composant principal CountryInfectionLayer (SHADER-BASED)
 */
export function CountryInfectionLayer({
  geoJsonUrl = '/world.geojson',
  infectedCountries = {},
  color = '#ff0000',
  rotationSpeed = 0.001,
}) {
  const groupRef = useRef();
  const meshRef = useRef();
  const materialRef = useRef();
  const { geoData: contextGeoData } = useGeoJson();
  const [geoData, setGeoData] = useState(null);
  const [countryIdTexture, setCountryIdTexture] = useState(null);
  const [countryIdMap, setCountryIdMap] = useState(null);
  const borderGeometriesRef = useRef([]);

  // Загрузка GeoJSON из Context
  useEffect(() => {
    if (contextGeoData) {
      setGeoData(contextGeoData);
    }
  }, [contextGeoData]);

  // Génération de la texture ID (une seule fois au chargement)
  useEffect(() => {
    if (!geoData) return;

    console.log('Generating country ID texture...');
    const { texture, countryIdMap: idMap } = generateCountryIdTexture(geoData);
    setCountryIdTexture(texture);
    setCountryIdMap(idMap);

    return () => {
      if (texture) texture.dispose();
    };
  }, [geoData]);

  // Shader material (recréé quand texture ou couleur change)
  const shaderMaterial = useMemo(() => {
    if (!countryIdTexture) return null;

    // Créer le tableau d'infection: [id1, progress1, id2, progress2, ...]
    const infectionData = new Float32Array(512); // Max 256 pays
    infectionData.fill(0);

    if (countryIdMap) {
      let index = 0;
      countryIdMap.forEach((id, countryName) => {
        const infection = infectedCountries[countryName];
        const progress = infection ? (infection.progress || 0) : 0;

        infectionData[index * 2] = id;
        infectionData[index * 2 + 1] = progress;
        index++;
      });
    }

    return createCountryShaderMaterial(countryIdTexture, infectionData, color);
  }, [countryIdTexture, countryIdMap, infectedCountries, color]);

  // Mettre à jour les uniforms quand infectedCountries change
  useEffect(() => {
    if (!materialRef.current || !countryIdMap) return;

    const infectionData = new Float32Array(512);
    infectionData.fill(0);

    let index = 0;
    countryIdMap.forEach((id, countryName) => {
      const infection = infectedCountries[countryName];
      const progress = infection ? (infection.progress || 0) : 0;

      infectionData[index * 2] = id;
      infectionData[index * 2 + 1] = progress;
      index++;
    });

    materialRef.current.uniforms.uInfectionData.value = infectionData;
    materialRef.current.uniformsNeedUpdate = true;
  }, [infectedCountries, countryIdMap]);

  // Créer les bordures blanches des pays (une seule fois)
  const countryBorders = useMemo(() => {
    if (!geoData || !geoData.features) return [];

    const borders = [];
    const radius = EARTH_RADIUS + 0.01; // Légèrement au-dessus du fill

    geoData.features.forEach((feature, featureIndex) => {
      const countryName = feature.properties?.name || feature.properties?.admin;
      if (!countryName) return;

      const { geometry } = feature;
      let coordinateArrays = [];

      if (geometry.type === 'Polygon') {
        coordinateArrays = geometry.coordinates;
      } else if (geometry.type === 'MultiPolygon') {
        coordinateArrays = geometry.coordinates.flat();
      }

      coordinateArrays.forEach((ring, ringIndex) => {
        if (ring.length > 2) {
          const borderGeometry = createBorderGeometry(ring, radius);
          if (borderGeometry) {
            borderGeometriesRef.current.push(borderGeometry);
            borders.push(
              <CountryBorder
                key={`border-${featureIndex}-${ringIndex}`}
                borderGeometry={borderGeometry}
              />
            );
          }
        }
      });
    });

    return borders;
  }, [geoData]);

  // Cleanup
  useEffect(() => {
    const geometries = borderGeometriesRef.current;
    return () => {
      geometries.forEach(geom => {
        if (geom) geom.dispose();
      });
      borderGeometriesRef.current = [];
    };
  }, []);

  // Rotation
  useFrame(() => {
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed;
    }
  });

  // Cleanup material on unmount
  useEffect(() => {
    return () => {
      if (shaderMaterial) shaderMaterial.dispose();
    };
  }, [shaderMaterial]);

  if (!shaderMaterial) return null;

  const radius = EARTH_RADIUS + 0.009;

  return (
    <group ref={groupRef}>
      {/* Sphère avec shader pour le remplissage des pays */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 128, 64]} />
        <primitive object={shaderMaterial} ref={materialRef} attach="material" />
      </mesh>

      {/* Bordures blanches des pays */}
      {countryBorders}
    </group>
  );
}

export default CountryInfectionLayer;
