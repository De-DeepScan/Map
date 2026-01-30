import { memo } from 'react';
import { InfectionBubbles } from './InfectionBubbles';

/**
 * InfectionBubblesManager
 *
 * Gestionnaire de toutes les bulles d'infection pour tous les pays
 * - Cree un InfectionBubbles par pays infecte
 * - Optimise avec memo pour eviter re-renders inutiles
 */
export const InfectionBubblesManager = memo(function InfectionBubblesManager({
  infectedCountries = {},
  maxBubblesPerCountry = 80,
  color = '#ff2222',
}) {
  const countryNames = Object.keys(infectedCountries);

  return (
    <group name="infection-bubbles-manager">
      {countryNames.map(countryName => {
        const country = infectedCountries[countryName];
        if (!country || !country.centroid) return null;

        return (
          <InfectionBubbles
            key={countryName}
            countryName={countryName}
            centroid={country.centroid}
            bubbleCount={country.bubbleCount || 0}
            maxBubbles={maxBubblesPerCountry}
            color={color}
          />
        );
      })}
    </group>
  );
});

export default InfectionBubblesManager;
