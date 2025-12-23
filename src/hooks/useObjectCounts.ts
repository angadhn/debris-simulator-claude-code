import { useMemo } from 'react';
import { useDebrisStore } from '../stores/debris-store';

export function useObjectCounts() {
  const debris = useDebrisStore((state) => state.debris);

  return useMemo(() => {
    const counts = {
      total: debris.length,
      payload: 0,
      rocketBody: 0,
      debris: 0,
      unknown: 0,
    };

    debris.forEach((d) => {
      const type = d.objectType.toUpperCase();
      if (type.includes('PAYLOAD')) {
        counts.payload++;
      } else if (type.includes('ROCKET') || type.includes('R/B')) {
        counts.rocketBody++;
      } else if (type.includes('DEBRIS')) {
        counts.debris++;
      } else {
        counts.unknown++;
      }
    });

    return counts;
  }, [debris]);
}
