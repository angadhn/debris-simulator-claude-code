import { useEffect } from 'react';
import { useDebrisStore } from '../stores/debris-store';
import { DebrisAPI } from '../services/debris-api';

/**
 * Hook to fetch and manage debris data
 * @param catalog - Catalog to fetch ('active', 'analyst', 'all')
 * @param limit - Maximum number of objects
 * @param autoFetch - Whether to fetch automatically on mount
 */
export function useDebrisData(
  catalog: string = 'active',
  limit: number = 1000,
  autoFetch: boolean = true
) {
  const { debris, loading, error, setDebris, setLoading, setError } = useDebrisStore();

  const fetchDebris = async (skipCache: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check backend health first
      const healthy = await DebrisAPI.healthCheck();
      if (!healthy) {
        throw new Error('Backend server is not available. Make sure to run: npm run dev:server');
      }

      // Fetch TLE data
      const response = await DebrisAPI.getTLEData(catalog, limit, skipCache);

      // Convert TLEData to DebrisObject format
      const debrisObjects = response.data.map((tle) => ({
        noradId: parseInt(tle.NORAD_CAT_ID),
        name: tle.OBJECT_NAME,
        objectType: tle.OBJECT_TYPE as 'PAYLOAD' | 'ROCKET_BODY' | 'DEBRIS' | 'UNKNOWN',
        tle: {
          line1: tle.TLE_LINE1,
          line2: tle.TLE_LINE2,
        },
        inclination: parseFloat(tle.INCLINATION),
        apogee: parseFloat(tle.APOAPSIS),
        perigee: parseFloat(tle.PERIAPSIS),
        orbitPeriod: parseFloat(tle.PERIOD) * 60, // Convert minutes to seconds
      }));

      setDebris(debrisObjects);
      setLoading(false);

      console.log(`Loaded ${debrisObjects.length} debris objects`);
    } catch (err) {
      console.error('Failed to fetch debris:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch debris data');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch && debris.length === 0 && !loading) {
      fetchDebris();
    }
  }, [autoFetch]); // Only run on mount if autoFetch is true

  return {
    debris,
    loading,
    error,
    fetchDebris,
    refetch: () => fetchDebris(true), // Force refresh from Space-Track
  };
}
