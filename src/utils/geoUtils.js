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
 * Interpole un point sur la surface de la sphère entre deux positions lat/lon
 * Suit un "great circle" (arc de grand cercle) pour une meilleure forme
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lon1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lon2 - Longitude du point 2
 * @param {number} t - Position sur l'arc (0 = point 1, 1 = point 2)
 * @param {number} radius - Rayon de la sphère
 * @returns {THREE.Vector3}
 */
export function interpolateOnSphere(lat1, lon1, lat2, lon2, t, radius = EARTH_RADIUS) {
  // Convertir en vecteurs 3D
  const p1 = latLonToVector3(lat1, lon1, radius);
  const p2 = latLonToVector3(lat2, lon2, radius);

  // Interpolation sphérique (slerp)
  const angle = p1.angleTo(p2);

  if (angle < 0.001) {
    // Points très proches, interpolation linéaire suffit
    return p1.clone().lerp(p2, t);
  }

  // Slerp pour suivre la courbure de la sphère
  const sinAngle = Math.sin(angle);
  const a = Math.sin((1 - t) * angle) / sinAngle;
  const b = Math.sin(t * angle) / sinAngle;

  return new THREE.Vector3(
    a * p1.x + b * p2.x,
    a * p1.y + b * p2.y,
    a * p1.z + b * p2.z
  );
}

/**
 * Subdivise un segment en plusieurs points pour suivre la courbure de la Terre
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lon1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lon2 - Longitude du point 2
 * @param {number} radius - Rayon de la sphère
 * @param {number} maxSegmentLength - Longueur maximale d'un segment en degrés
 * @returns {Array<[number, number]>} - Tableau de coordonnées [lon, lat]
 */
export function subdivideSegment(lat1, lon1, lat2, lon2, radius = EARTH_RADIUS, maxSegmentLength = 5) {
  const distance = geoDistance(lat1, lon1, lat2, lon2);

  // Si le segment est assez court, pas de subdivision
  if (distance <= maxSegmentLength) {
    return [[lon1, lat1], [lon2, lat2]];
  }

  // Calculer le nombre de subdivisions nécessaires
  const numSegments = Math.ceil(distance / maxSegmentLength);
  const points = [];

  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const point = interpolateOnSphere(lat1, lon1, lat2, lon2, t, radius);

    // Convertir le point 3D en lat/lon
    const { lat, lon } = vector3ToLatLon(point);
    points.push([lon, lat]);
  }

  return points;
}

/**
 * Subdivise un anneau de polygone pour qu'il suive la courbure de la Terre
 * @param {Array<[number, number]>} ring - Coordonnées [lon, lat]
 * @param {number} radius - Rayon de la sphère
 * @param {number} maxSegmentLength - Longueur maximale d'un segment
 * @returns {Array<[number, number]>} - Ring subdivisé
 */
export function subdivideRing(ring, radius = EARTH_RADIUS, maxSegmentLength = 5) {
  if (ring.length < 2) return ring;

  const subdividedRing = [];

  for (let i = 0; i < ring.length; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[(i + 1) % ring.length];

    const segmentPoints = subdivideSegment(lat1, lon1, lat2, lon2, radius, maxSegmentLength);

    // Ajouter tous les points sauf le dernier (qui sera le premier du segment suivant)
    for (let j = 0; j < segmentPoints.length - 1; j++) {
      subdividedRing.push(segmentPoints[j]);
    }
  }

  return subdividedRing;
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
