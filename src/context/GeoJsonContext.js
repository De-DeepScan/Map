import React, { createContext, useContext, useState, useEffect } from 'react';

const GeoJsonContext = createContext(null);

export const GeoJsonProvider = ({ children }) => {
  const [geoData, setGeoData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadGeoJson = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/world.geojson');

        if (!response.ok) {
          throw new Error(`Failed to load GeoJSON: ${response.status}`);
        }

        const data = await response.json();

        if (isMounted) {
          setGeoData(data);
          setError(null);
        }
      } catch (err) {
        console.error('Error loading GeoJSON:', err);
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadGeoJson();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <GeoJsonContext.Provider value={{ geoData, isLoading, error }}>
      {children}
    </GeoJsonContext.Provider>
  );
};

export const useGeoJson = () => {
  const context = useContext(GeoJsonContext);

  if (context === null) {
    throw new Error('useGeoJson must be used within a GeoJsonProvider');
  }

  return context;
};
