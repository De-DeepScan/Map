/**
 * Утилиты для работы со странами
 * - Извлечение данных о странах из GeoJSON
 * - Расчёт соседей
 */

/**
 * Вычисляет центроид полигона
 */
function calculateCentroid(coordinates) {
  let sumLat = 0;
  let sumLon = 0;
  let count = 0;

  coordinates.forEach(([lon, lat]) => {
    sumLon += lon;
    sumLat += lat;
    count++;
  });

  return {
    lat: sumLat / count,
    lon: sumLon / count,
  };
}

/**
 * Получает центроид для геометрии (Polygon или MultiPolygon)
 */
function getGeometryCentroid(geometry) {
  if (geometry.type === 'Polygon') {
    return calculateCentroid(geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    let largestArea = 0;
    let centroid = { lat: 0, lon: 0 };

    geometry.coordinates.forEach(polygon => {
      const coords = polygon[0];
      const area = Math.abs(coords.reduce((sum, [lon, lat], i) => {
        const j = (i + 1) % coords.length;
        return sum + coords[i][0] * coords[j][1] - coords[j][0] * coords[i][1];
      }, 0) / 2);

      if (area > largestArea) {
        largestArea = area;
        centroid = calculateCentroid(coords);
      }
    });

    return centroid;
  }
  return { lat: 0, lon: 0 };
}

/**
 * Расстояние между двумя географическими точками
 */
function geoDistanceSimple(lat1, lon1, lat2, lon2) {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const latFactor = Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
  return Math.sqrt(dLat * dLat + (dLon * latFactor) * (dLon * latFactor));
}

/**
 * Извлекает данные всех стран из GeoJSON
 */
export function extractCountryData(geoData) {
  if (!geoData || !geoData.features) return [];

  return geoData.features.map((feature, index) => {
    const name = feature.properties?.name || feature.properties?.admin || `Country ${index}`;
    const centroid = getGeometryCentroid(feature.geometry);
    const continent = feature.properties?.continent || 'Unknown';

    return {
      name,
      centroid,
      continent,
      geometry: feature.geometry,
    };
  });
}

/**
 * Находит соседей для каждой страны
 */
export function findNeighbors(countries, maxDistance = 25) {
  const neighbors = {};

  countries.forEach(country => {
    neighbors[country.name] = [];

    countries.forEach(other => {
      if (country.name === other.name) return;

      const dist = geoDistanceSimple(
        country.centroid.lat,
        country.centroid.lon,
        other.centroid.lat,
        other.centroid.lon
      );

      const sameContinent = country.continent === other.continent;
      const threshold = sameContinent ? maxDistance : maxDistance * 0.6;

      if (dist < threshold) {
        neighbors[country.name].push({
          name: other.name,
          distance: dist,
        });
      }
    });

    neighbors[country.name].sort((a, b) => a.distance - b.distance);
  });

  return neighbors;
}
