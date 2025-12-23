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
    inclination: parseFloat(tle.INCLINATION) || undefined,
    apogee: parseFloat(tle.APOAPSIS) || undefined,
    perigee: parseFloat(tle.PERIAPSIS) || undefined,
    orbitPeriod: parseFloat(tle.PERIOD) ? parseFloat(tle.PERIOD) * 60 : undefined, // Convert minutes to seconds
    eccentricity: parseFloat(tle.ECCENTRICITY) || undefined,
    meanMotion: parseFloat(tle.MEAN_MOTION) || undefined,
    semiMajorAxis: parseFloat(tle.SEMIMAJOR_AXIS) || undefined,
    rcsSize: tle.RCS_SIZE || undefined,
    countryCode: tle.COUNTRY_CODE || undefined,
  };
}

/**
 * Convert multiple TLE data entries to DebrisObject format
 */
export function convertTLEArrayToDebrisObjects(tleArray: TLEData[]): DebrisObject[] {
  return tleArray.map(convertTLEToDebrisObject);
}
