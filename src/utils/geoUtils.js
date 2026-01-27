import * as THREE from 'three';

/**
 * Utilitaires géographiques
 * Conversion latitude/longitude → coordonnées 3D sur une sphère
 */

// Rayon de la Terre dans la scène (doit correspondre à Earth.js)
export const EARTH_RADIUS = 2;

/**
 * Convertit latitude/longitude en position Vector3 sur la sphère
 * @param {number} lat - Latitude en degrés (-90 à 90)
 * @param {number} lon - Longitude en degrés (-180 à 180)
 * @param {number} radius - Rayon de la sphère
 * @returns {THREE.Vector3}
 */
export function latLonToVector3(lat, lon, radius = EARTH_RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

/**
 * Convertit Vector3 en latitude/longitude
 * @param {THREE.Vector3} position
 * @returns {{lat: number, lon: number}}
 */
export function vector3ToLatLon(position) {
  const radius = position.length();
  const lat = 90 - Math.acos(position.y / radius) * (180 / Math.PI);
  const lon = Math.atan2(position.z, -position.x) * (180 / Math.PI) - 180;

  return { lat, lon: lon < -180 ? lon + 360 : lon };
}

/**
 * Génère une position aléatoire autour d'un point
 * @param {number} lat - Latitude centrale
 * @param {number} lon - Longitude centrale
 * @param {number} maxDistance - Distance maximale en degrés
 * @returns {{lat: number, lon: number}}
 */
export function randomNearbyPosition(lat, lon, maxDistance = 15) {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * maxDistance;

  const newLat = Math.max(-85, Math.min(85, lat + Math.sin(angle) * distance));
  const newLon = lon + Math.cos(angle) * distance / Math.cos(lat * Math.PI / 180);

  return {
    lat: newLat,
    lon: ((newLon + 180) % 360) - 180
  };
}

/**
 * Calcule la distance entre deux points (en degrés approximatifs)
 */
export function geoDistance(lat1, lon1, lat2, lon2) {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

/**
 * Crée une courbe de Bézier entre deux points sur la sphère
 * Pour les routes d'infection intercontinentales
 */
export function createArcBetweenPoints(start, end, height = 0.5) {
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const distance = start.distanceTo(end);

  // Élever le point central au-dessus de la surface
  midPoint.normalize().multiplyScalar(EARTH_RADIUS + distance * height);

  return new THREE.QuadraticBezierCurve3(start, midPoint, end);
}

/**
 * Villes majeures avec coordonnées (points de départ potentiels)
 */
export const MAJOR_CITIES = [
  { name: 'Paris', lat: 48.9, lon: 2.3 },
  { name: 'Beijing', lat: 39.9, lon: 116.4 },
  { name: 'New York', lat: 40.7, lon: -74.0 },
  { name: 'London', lat: 51.5, lon: -0.1 },
  { name: 'Tokyo', lat: 35.7, lon: 139.7 },
  { name: 'Mumbai', lat: 19.0, lon: 72.9 },
  { name: 'São Paulo', lat: -23.5, lon: -46.6 },
  { name: 'Cairo', lat: 30.0, lon: 31.2 },
  { name: 'Sydney', lat: -33.9, lon: 151.2 },
  { name: 'Moscow', lat: 55.8, lon: 37.6 },
  { name: 'Lagos', lat: 6.5, lon: 3.4 },
];
