import type { DebrisObject } from '../types/debris';
import type { TLEData } from '../services/debris-api';

/**
 * Convert TLE data from the API to DebrisObject format
 */
export function convertTLEToDebrisObject(tle: TLEData): DebrisObject {
  return {
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
    rcsSize: tle.RCS_SIZE || undefined,
  };
}

/**
 * Convert multiple TLE data entries to DebrisObject format
 */
export function convertTLEArrayToDebrisObjects(tleArray: TLEData[]): DebrisObject[] {
  return tleArray.map(convertTLEToDebrisObject);
}
