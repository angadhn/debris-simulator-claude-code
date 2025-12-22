import * as satellite from 'satellite.js';
import * as Cesium from 'cesium';
import type { TLEData } from '../services/debris-api';

export interface DebrisPosition {
  noradId: string;
  name: string;
  objectType: string;
  position: Cesium.Cartesian3;
  velocity?: Cesium.Cartesian3;
  satrec: satellite.SatRec;
}

/**
 * Parse TLE and create satellite record
 */
export function parseTLE(tleData: TLEData): satellite.SatRec | null {
  try {
    const satrec = satellite.twoline2satrec(
      tleData.TLE_LINE1,
      tleData.TLE_LINE2
    );

    if (satrec.error !== 0) {
      console.warn(`TLE parsing error for ${tleData.OBJECT_NAME}: ${satrec.error}`);
      return null;
    }

    return satrec;
  } catch (error) {
    console.error(`Failed to parse TLE for ${tleData.OBJECT_NAME}:`, error);
    return null;
  }
}

/**
 * Propagate satellite position at a specific time
 */
export function propagatePosition(
  satrec: satellite.SatRec,
  time: Date
): { position: Cesium.Cartesian3; velocity: Cesium.Cartesian3 } | null {
  try {
    // Propagate using SGP4
    const positionAndVelocity = satellite.propagate(satrec, time);

    if (!positionAndVelocity.position || satellite.error) {
      return null;
    }

    const posEci = positionAndVelocity.position as satellite.EciVec3<number>;
    const velEci = positionAndVelocity.velocity as satellite.EciVec3<number>;

    // Convert ECI to Cesium Cartesian3 (ECEF)
    // ECI coordinates are in km, Cesium uses meters
    const gmst = satellite.gstime(time);

    // Convert ECI to ECEF
    const posEcef = eciToEcef(posEci, gmst);
    const velEcef = eciToEcef(velEci, gmst);

    return {
      position: new Cesium.Cartesian3(
        posEcef.x * 1000, // km to meters
        posEcef.y * 1000,
        posEcef.z * 1000
      ),
      velocity: new Cesium.Cartesian3(
        velEcef.x * 1000,
        velEcef.y * 1000,
        velEcef.z * 1000
      ),
    };
  } catch (error) {
    console.error('Propagation error:', error);
    return null;
  }
}

/**
 * Convert ECI (Earth-Centered Inertial) to ECEF (Earth-Centered Earth-Fixed)
 */
function eciToEcef(
  eci: satellite.EciVec3<number>,
  gmst: number
): { x: number; y: number; z: number } {
  // Rotation matrix from ECI to ECEF
  const cosGmst = Math.cos(gmst);
  const sinGmst = Math.sin(gmst);

  return {
    x: cosGmst * eci.x + sinGmst * eci.y,
    y: -sinGmst * eci.x + cosGmst * eci.y,
    z: eci.z,
  };
}

/**
 * Get color for debris object based on type
 */
export function getDebrisColor(objectType: string): Cesium.Color {
  const type = objectType.toUpperCase();

  if (type.includes('PAYLOAD')) {
    return Cesium.Color.WHITE; // Active satellites
  } else if (type.includes('ROCKET') || type.includes('R/B')) {
    return Cesium.Color.RED; // Rocket bodies
  } else if (type.includes('DEBRIS')) {
    return Cesium.Color.GRAY; // Debris fragments
  } else {
    return Cesium.Color.YELLOW; // Unknown
  }
}

/**
 * Propagate all debris positions at a specific time
 */
export function propagateAllDebris(
  tleDataList: TLEData[],
  time: Date
): DebrisPosition[] {
  const positions: DebrisPosition[] = [];

  for (const tleData of tleDataList) {
    const satrec = parseTLE(tleData);
    if (!satrec) continue;

    const result = propagatePosition(satrec, time);
    if (!result) continue;

    positions.push({
      noradId: tleData.NORAD_CAT_ID,
      name: tleData.OBJECT_NAME,
      objectType: tleData.OBJECT_TYPE,
      position: result.position,
      velocity: result.velocity,
      satrec,
    });
  }

  console.log(`Propagated ${positions.length}/${tleDataList.length} debris objects`);
  return positions;
}

/**
 * Generate orbit path for a debris object
 * @param satrec - Satellite record
 * @param startTime - Start time for orbit path
 * @param duration - Duration in seconds
 * @param step - Time step in seconds
 */
export function generateOrbitPath(
  satrec: satellite.SatRec,
  startTime: Date,
  duration: number = 6000, // ~1 orbit for LEO
  step: number = 60 // 1 minute
): Cesium.Cartesian3[] {
  const positions: Cesium.Cartesian3[] = [];

  for (let t = 0; t <= duration; t += step) {
    const time = new Date(startTime.getTime() + t * 1000);
    const result = propagatePosition(satrec, time);

    if (result) {
      positions.push(result.position);
    }
  }

  return positions;
}
