import { memo } from 'react';
import { InfectionRoute } from './InfectionRoute';

/**
 * TransmissionArcsManager
 *
 * Gestionnaire des arcs de transmission animes
 * - Les arcs restent visibles apres l'animation
 */
export const TransmissionArcsManager = memo(function TransmissionArcsManager({
  activeTransmissions = [],
  getCountryCentroid,
  color = '#ff3333',
  longDistanceColor = '#ff6644',
}) {
  return (
    <group name="transmission-arcs-manager">
      {activeTransmissions.map(transmission => {
        const fromCentroid = getCountryCentroid(transmission.from);
        const toCentroid = getCountryCentroid(transmission.to);

        if (!fromCentroid || !toCentroid) return null;

        // Duree plus longue pour les sauts longue distance
        const duration = transmission.isLongDistance ? 4.0 : 2.5;
        const arcColor = transmission.isLongDistance ? longDistanceColor : color;

        return (
          <InfectionRoute
            key={transmission.id}
            fromLat={fromCentroid.lat}
            fromLon={fromCentroid.lon}
            toLat={toCentroid.lat}
            toLon={toCentroid.lon}
            duration={duration}
            color={arcColor}
            delay={0}
          />
        );
      })}
    </group>
  );
});

export default TransmissionArcsManager;
