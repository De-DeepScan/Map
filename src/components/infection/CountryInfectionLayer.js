import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import earcut from 'earcut';
import { EARTH_RADIUS } from '../../utils/geoUtils';

/**
 * CountryInfectionLayer
 *
 * Визуализация заражения по странам
 * Заполняет страны красным цветом в пределах границ
 */

// Компонент для одной заражённой страны
const InfectedCountryMesh = memo(({ geometry, infectionProgress, color }) => {
  // Ровная прозрачность - плавное появление, потом стабильный цвет
  // Используем меньшую прозрачность для более равномерного вида
  const opacity = Math.min(0.5, infectionProgress * 0.6);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} renderOrder={100}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.FrontSide}
        depthTest={true}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
});

InfectedCountryMesh.displayName = 'InfectedCountryMesh';

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
 * Создание геометрии полигона страны с правильной триангуляцией
 * Использует earcut для корректной обработки вогнутых полигонов
 */
function createPolygonGeometry(coordinates, radius) {
  if (coordinates.length < 3) return null;

  // Массив 2D координат для earcut (lat/lon)
  const flatCoords = [];
  // Массив 3D точек для геометрии
  const points3D = [];

  coordinates.forEach(([lon, lat]) => {
    // 2D для триангуляции
    flatCoords.push(lon, lat);
    // 3D для геометрии
    const { x, y, z } = latLonTo3D(lat, lon, radius);
    points3D.push(x, y, z);
  });

  // Триангуляция с earcut (правильно обрабатывает вогнутые полигоны)
  const indices = earcut(flatCoords, null, 2);

  if (indices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points3D, 3));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Основной компонент CountryInfectionLayer
 */
export function CountryInfectionLayer({
  geoJsonUrl = '/world.geojson',
  infectedCountries = {},
  color = '#ff0000',
  rotationSpeed = 0.001,
}) {
  const groupRef = useRef();
  const [geoData, setGeoData] = useState(null);

  // Загрузка GeoJSON
  useEffect(() => {
    fetch(geoJsonUrl)
      .then(response => response.json())
      .then(data => setGeoData(data))
      .catch(error => console.error('Error loading GeoJSON:', error));
  }, [geoJsonUrl]);

  // Ротация
  useFrame(() => {
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed;
    }
  });

  // Создание мешей для заражённых стран
  const infectedMeshes = useMemo(() => {
    if (!geoData || !geoData.features) return [];

    const meshes = [];
    const radius = EARTH_RADIUS + 0.012;

    geoData.features.forEach((feature, featureIndex) => {
      const countryName = feature.properties?.name || feature.properties?.admin;
      if (!countryName) return;

      const infection = infectedCountries[countryName];
      if (!infection) return;

      const { geometry } = feature;
      let coordinateArrays = [];

      if (geometry.type === 'Polygon') {
        coordinateArrays = geometry.coordinates;
      } else if (geometry.type === 'MultiPolygon') {
        coordinateArrays = geometry.coordinates.flat();
      }

      coordinateArrays.forEach((ring, ringIndex) => {
        if (ring.length > 2) {
          const geom = createPolygonGeometry(ring, radius);
          if (geom) {
            meshes.push(
              <InfectedCountryMesh
                key={`infected-${featureIndex}-${ringIndex}`}
                geometry={geom}
                infectionProgress={infection.progress || 1}
                color={color}
              />
            );
          }
        }
      });
    });

    return meshes;
  }, [geoData, infectedCountries, color]);

  return (
    <group ref={groupRef}>
      {infectedMeshes}
    </group>
  );
}

export default CountryInfectionLayer;
