import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS, subdivideRing } from '../../utils/geoUtils';
import { useGeoJson } from '../../context/GeoJsonContext';

/**
 * CountryInfectionLayer - Infection qui se propage depuis le point d'entree
 */

const CountryBorder = memo(({ borderGeometry }) => {
  if (!borderGeometry) return null;
  return (
    <line geometry={borderGeometry} renderOrder={2}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.6} depthWrite={false} />
    </line>
  );
});
CountryBorder.displayName = 'CountryBorder';

function latLonTo3D(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

function ringCrossesAntimeridian(ring) {
  for (let i = 0; i < ring.length - 1; i++) {
    if (Math.abs(ring[i + 1][0] - ring[i][0]) > 180) return true;
  }
  return false;
}

function createBorderGeometry(coordinates, radius) {
  if (coordinates.length < 3 || ringCrossesAntimeridian(coordinates)) return null;
  const subdividedCoords = subdivideRing(coordinates, radius, 5);
  const borderPoints = subdividedCoords.map(([lon, lat]) => {
    const { x, y, z } = latLonTo3D(lat, lon, radius);
    return new THREE.Vector3(x, y, z);
  });
  return new THREE.BufferGeometry().setFromPoints(borderPoints);
}

function pointInPolygon(lon, lat, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function generateCountryIdTexture(geoData) {
  const width = 4096;
  const height = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  const countryIdMap = new Map();
  let currentId = 1;

  geoData.features.forEach((feature) => {
    const countryName = feature.properties?.name || feature.properties?.admin;
    if (!countryName) return;

    if (!countryIdMap.has(countryName)) {
      countryIdMap.set(countryName, currentId);
      currentId++;
      if (currentId > 255) currentId = 255;
    }

    const countryId = countryIdMap.get(countryName);
    ctx.fillStyle = `rgb(${countryId}, ${countryId}, ${countryId})`;

    const { geometry } = feature;
    let polygons = [];

    if (geometry.type === 'Polygon') {
      polygons = [geometry.coordinates[0]];
    } else if (geometry.type === 'MultiPolygon') {
      polygons = geometry.coordinates.map(poly => poly[0]);
    }

    polygons.forEach(polygon => {
      if (polygon.length < 3) return;
      const hasJump = polygon.some((coord, i) => i > 0 && Math.abs(coord[0] - polygon[i-1][0]) > 180);
      if (hasJump) return;

      const lons = polygon.map(p => p[0]);
      const lats = polygon.map(p => p[1]);
      const minLon = Math.min(...lons), maxLon = Math.max(...lons);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);

      const xMin = Math.floor(((minLon + 180) / 360) * width);
      const xMax = Math.ceil(((maxLon + 180) / 360) * width);
      const yMin = Math.floor(((90 - maxLat) / 180) * height);
      const yMax = Math.ceil(((90 - minLat) / 180) * height);

      for (let y = Math.max(0, yMin); y < Math.min(height, yMax); y++) {
        for (let x = Math.max(0, xMin); x < Math.min(width, xMax); x++) {
          const lon = (x / width) * 360 - 180;
          const lat = 90 - (y / height) * 180;
          if (pointInPolygon(lon, lat, polygon)) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  return { texture, countryIdMap };
}

// Creer une texture de donnees d'infection (256x1, RGBA)
// R = progress, G = entryLat (normalise), B = entryLon (normalise), A = 1 si infecte
function createInfectionDataTexture() {
  const data = new Uint8Array(256 * 4);
  const texture = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

function updateInfectionDataTexture(texture, countryIdMap, infectedCountries) {
  const data = texture.image.data;
  data.fill(0);

  Object.keys(infectedCountries).forEach(countryName => {
    const id = countryIdMap.get(countryName);
    if (id === undefined || id >= 256) return;

    const infection = infectedCountries[countryName];
    const progress = Math.min(1, infection.progress || 0);
    const entryLat = infection.entryPoint?.lat || 0;
    const entryLon = infection.entryPoint?.lon || 0;

    // Normaliser lat [-90, 90] -> [0, 255]
    const latNorm = Math.floor(((entryLat + 90) / 180) * 255);
    // Normaliser lon [-180, 180] -> [0, 255]
    const lonNorm = Math.floor(((entryLon + 180) / 360) * 255);

    const idx = id * 4;
    data[idx] = Math.floor(progress * 255);     // R = progress
    data[idx + 1] = latNorm;                     // G = entryLat
    data[idx + 2] = lonNorm;                     // B = entryLon
    data[idx + 3] = 255;                         // A = infecte
  });

  texture.needsUpdate = true;
}

function createCountryShaderMaterial(countryIdTexture, infectionDataTexture, infectedColor) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCountryIdTexture: { value: countryIdTexture },
      uInfectionTexture: { value: infectionDataTexture },
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
      uniform sampler2D uInfectionTexture;
      uniform vec3 uInfectedColor;
      uniform vec3 uBlackColor;

      varying vec3 vPosition;

      const float PI = 3.14159265359;
      const float MAX_SPREAD = 80.0;
      const float GRID_SCALE = 2.5;  // Espacement de la grille
      const float POINT_SIZE = 0.35;  // Taille des points

      // Fonction de bruit pseudo-aleatoire
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      // Grille hexagonale ordonnee
      float hexGrid(vec2 p, float scale) {
        vec2 scaled = p * scale;

        // Decalage hexagonal: lignes paires vs impaires
        float row = floor(scaled.y);
        float xOffset = mod(row, 2.0) * 0.5;

        // Position dans la cellule
        vec2 cell = vec2(scaled.x + xOffset, scaled.y);
        vec2 cellId = floor(cell);
        vec2 cellUV = fract(cell) - 0.5;

        // Distance au centre de la cellule
        float dist = length(cellUV);

        return dist;
      }

      float geoDistance(float lat1, float lon1, float lat2, float lon2) {
        float dLat = lat2 - lat1;
        float dLon = lon2 - lon1;
        if (dLon > 180.0) dLon -= 360.0;
        if (dLon < -180.0) dLon += 360.0;
        return sqrt(dLat * dLat + dLon * dLon);
      }

      void main() {
        vec3 normalized = normalize(vPosition);
        float lat = asin(clamp(normalized.y, -1.0, 1.0));
        float lon = atan(-normalized.z, normalized.x);

        float latDeg = lat * 180.0 / PI;
        float lonDeg = lon * 180.0 / PI;

        vec2 uv;
        uv.x = (lon / PI + 1.0) * 0.5;
        uv.y = 0.5 + (lat / PI);

        if (uv.x < 0.002 || uv.x > 0.998) discard;

        vec4 idColor = texture2D(uCountryIdTexture, uv);
        float countryId = idColor.r * 255.0;

        if (countryId < 0.5) discard;

        vec2 dataUV = vec2((countryId + 0.5) / 256.0, 0.5);
        vec4 infectionData = texture2D(uInfectionTexture, dataUV);

        if (infectionData.a < 0.5) {
          gl_FragColor = vec4(uBlackColor, 1.0);
          return;
        }

        float progress = infectionData.r;
        float entryLat = infectionData.g * 180.0 - 90.0;
        float entryLon = infectionData.b * 360.0 - 180.0;

        float dist = geoDistance(latDeg, lonDeg, entryLat, entryLon);

        vec2 gridCoord = vec2(lonDeg, latDeg);

        // Distance normalisee (0 au point d'entree, 1 au bord max)
        float normalizedDist = dist / MAX_SPREAD;

        // Creer des points avec grille hexagonale ordonnee
        float pointPattern = hexGrid(gridCoord, GRID_SCALE);
        float isPoint = 1.0 - step(POINT_SIZE, pointPattern); // Points au centre des cellules

        // Legere variation pour l'apparition (basee sur la position de la cellule)
        vec2 cellId = floor(gridCoord * GRID_SCALE);
        float randomOffset = (hash(cellId) - 0.5) * 0.08;

        // Le point apparait quand progress depasse sa distance normalisee
        // Les points proches (normalizedDist petit) apparaissent en premier
        float pointAppearTime = normalizedDist + randomOffset;

        // Le point est visible si progress > son temps d'apparition
        float pointVisible = isPoint * step(pointAppearTime, progress);

        // Pas de remplissage uniforme - seulement les points
        float infected = clamp(pointVisible, 0.0, 1.0);

        vec3 color = mix(uBlackColor, uInfectedColor, infected);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true,
  });
}

export function CountryInfectionLayer({
  infectedCountries = {},
  color = '#ff0000',
  rotationSpeed = 0.001,
}) {
  const groupRef = useRef();
  const { geoData: contextGeoData } = useGeoJson();
  const [geoData, setGeoData] = useState(null);
  const [countryIdTexture, setCountryIdTexture] = useState(null);
  const [countryIdMap, setCountryIdMap] = useState(null);
  const infectionTextureRef = useRef(null);
  const materialRef = useRef(null);
  const borderGeometriesRef = useRef([]);

  useEffect(() => {
    if (contextGeoData) setGeoData(contextGeoData);
  }, [contextGeoData]);

  useEffect(() => {
    if (!geoData) return;
    const { texture, countryIdMap: idMap } = generateCountryIdTexture(geoData);
    setCountryIdTexture(texture);
    setCountryIdMap(idMap);
    return () => texture?.dispose();
  }, [geoData]);

  // Creer la texture d'infection et le material
  useEffect(() => {
    if (!countryIdTexture) return;

    infectionTextureRef.current = createInfectionDataTexture();
    materialRef.current = createCountryShaderMaterial(
      countryIdTexture,
      infectionTextureRef.current,
      color
    );

    return () => {
      infectionTextureRef.current?.dispose();
      materialRef.current?.dispose();
    };
  }, [countryIdTexture, color]);

  // Mettre a jour les donnees d'infection
  useEffect(() => {
    if (!infectionTextureRef.current || !countryIdMap) return;
    updateInfectionDataTexture(infectionTextureRef.current, countryIdMap, infectedCountries);
  }, [infectedCountries, countryIdMap]);

  const countryBorders = useMemo(() => {
    if (!geoData?.features) return [];
    const borders = [];
    const radius = EARTH_RADIUS + 0.01;

    geoData.features.forEach((feature, fi) => {
      const { geometry } = feature;
      let arrays = geometry.type === 'Polygon' ? geometry.coordinates :
                   geometry.type === 'MultiPolygon' ? geometry.coordinates.flat() : [];

      arrays.forEach((ring, ri) => {
        if (ring.length > 2) {
          const geom = createBorderGeometry(ring, radius);
          if (geom) {
            borderGeometriesRef.current.push(geom);
            borders.push(<CountryBorder key={`b-${fi}-${ri}`} borderGeometry={geom} />);
          }
        }
      });
    });
    return borders;
  }, [geoData]);

  useEffect(() => {
    const geoms = borderGeometriesRef.current;
    return () => geoms.forEach(g => g?.dispose());
  }, []);

  useFrame(() => {
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed;
    }
  });

  if (!materialRef.current) return null;

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS + 0.009, 96, 48]} />
        <primitive object={materialRef.current} attach="material" />
      </mesh>
      {countryBorders}
    </group>
  );
}

export default CountryInfectionLayer;
