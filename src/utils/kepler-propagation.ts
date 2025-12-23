import * as Cesium from 'cesium';

/**
 * Kepler orbit propagation utilities
 * Based on ASTRIA Graph's fast 2-body approach
 * Trade-off: ~1% position error vs 100-200x performance improvement over SGP4
 */

const TwoPi = 2 * Math.PI;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Solve Kepler's equation for eccentric anomaly using Newton-Raphson
 * E - e*sin(E) = M
 *
 * @param meanAnomaly Mean anomaly in radians
 * @param eccentricity Orbital eccentricity (0 = circle, >0 = ellipse)
 * @param tolerance Convergence tolerance (1E-3 for speed, 1E-6 for accuracy)
 * @returns Eccentric anomaly in radians
 */
export function solveEccentricAnomaly(
  meanAnomaly: number,
  eccentricity: number,
  tolerance: number = 1e-3
): number {
  // Initial guess
  let E = meanAnomaly;

  // Newton-Raphson iteration
  let delta = 1;
  let iterations = 0;
  const maxIterations = 10;

  while (Math.abs(delta) > tolerance && iterations < maxIterations) {
    const sinE = Math.sin(E);
    const cosE = Math.cos(E);

    // f(E) = E - e*sin(E) - M
    const f = E - eccentricity * sinE - meanAnomaly;

    // f'(E) = 1 - e*cos(E)
    const fPrime = 1 - eccentricity * cosE;

    delta = f / fPrime;
    E -= delta;
    iterations++;
  }

  return E;
}

/**
 * Convert orbital elements to ECI Cartesian coordinates
 *
 * @param semiMajorAxis Semi-major axis in km
 * @param eccentricity Orbital eccentricity
 * @param inclination Inclination in degrees
 * @param raan Right Ascension of Ascending Node in degrees
 * @param argOfPerigee Argument of perigee in degrees
 * @param eccentricAnomaly Eccentric anomaly in radians
 * @returns Position in ECI coordinates [x, y, z] in meters
 */
export function orbitalElementsToCartesian(
  semiMajorAxis: number,
  eccentricity: number,
  inclination: number,
  raan: number,
  argOfPerigee: number,
  eccentricAnomaly: number
): [number, number, number] {
  // Convert angles to radians
  const i = inclination * DEG_TO_RAD;
  const omega = raan * DEG_TO_RAD;
  const w = argOfPerigee * DEG_TO_RAD;

  // Calculate position in orbital plane
  const cosE = Math.cos(eccentricAnomaly);
  const sinE = Math.sin(eccentricAnomaly);

  const x_orb = semiMajorAxis * (cosE - eccentricity);
  const y_orb = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity) * sinE;

  // Rotation matrices to transform to ECI
  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);

  // Apply rotation: R_z(-Omega) * R_x(-i) * R_z(-w)
  const x = (cosOmega * cosW - sinOmega * sinW * cosI) * x_orb +
            (-cosOmega * sinW - sinOmega * cosW * cosI) * y_orb;

  const y = (sinOmega * cosW + cosOmega * sinW * cosI) * x_orb +
            (-sinOmega * sinW + cosOmega * cosW * cosI) * y_orb;

  const z = (sinW * sinI) * x_orb + (cosW * sinI) * y_orb;

  // Convert from km to meters for Cesium
  return [x * 1000, y * 1000, z * 1000];
}

/**
 * Parse TLE to extract orbital elements needed for Kepler propagation
 */
export function parseTLEOrbitalElements(line1: string, line2: string) {
  // Line 1: Epoch
  const epochStr = line1.substring(18, 32).trim();
  const year2digit = parseInt(epochStr.substring(0, 2));
  const year = year2digit >= 57 ? 1900 + year2digit : 2000 + year2digit;
  const dayOfYear = parseFloat(epochStr.substring(2));
  const epochDate = new Date(Date.UTC(year, 0, 1));
  epochDate.setUTCDate(dayOfYear);

  // Line 2: Orbital elements
  const inclination = parseFloat(line2.substring(8, 16).trim()); // degrees
  const raan = parseFloat(line2.substring(17, 25).trim()); // degrees (Right Ascension of Ascending Node)
  const eccentricityStr = line2.substring(26, 33).trim();
  const eccentricity = parseFloat('0.' + eccentricityStr);
  const argOfPerigee = parseFloat(line2.substring(34, 42).trim()); // degrees
  const meanAnomalyDeg = parseFloat(line2.substring(43, 51).trim()); // degrees
  const meanMotion = parseFloat(line2.substring(52, 63).trim()); // revolutions per day

  // Calculate semi-major axis from mean motion
  // n = sqrt(GM/a^3) -> a = (GM/n^2)^(1/3)
  // where n is in rad/s
  const GM = 398600.4418; // km^3/s^2 (Earth's gravitational parameter)
  const meanMotionRadPerSec = (meanMotion * TwoPi) / 86400; // Convert rev/day to rad/s
  const semiMajorAxis = Math.pow(GM / (meanMotionRadPerSec * meanMotionRadPerSec), 1/3); // km

  return {
    epochDate,
    semiMajorAxis,
    eccentricity,
    inclination,
    raan,
    argOfPerigee,
    meanAnomalyAtEpoch: meanAnomalyDeg * DEG_TO_RAD, // Convert to radians
    meanMotion: meanMotionRadPerSec, // rad/s
  };
}

/**
 * Calculate position at a given time using Kepler propagation
 *
 * @param orbitalElements Orbital elements from parseTLEOrbitalElements
 * @param time Current time
 * @returns Position in ECI coordinates [x, y, z] in meters
 */
export function propagateKeplerPosition(
  orbitalElements: ReturnType<typeof parseTLEOrbitalElements>,
  time: Date
): [number, number, number] {
  // Calculate elapsed time since epoch in seconds
  const elapsedTimeSec = (time.getTime() - orbitalElements.epochDate.getTime()) / 1000;

  // Update mean anomaly: M = M0 + n*t
  const meanAnomaly = (orbitalElements.meanAnomalyAtEpoch +
                      orbitalElements.meanMotion * elapsedTimeSec) % TwoPi;

  // Solve for eccentric anomaly
  const eccentricAnomaly = solveEccentricAnomaly(
    meanAnomaly,
    orbitalElements.eccentricity,
    1e-3 // Fast tolerance like ASTRIA
  );

  // Convert to Cartesian coordinates
  return orbitalElementsToCartesian(
    orbitalElements.semiMajorAxis,
    orbitalElements.eccentricity,
    orbitalElements.inclination,
    orbitalElements.raan,
    orbitalElements.argOfPerigee,
    eccentricAnomaly
  );
}

/**
 * Create a Cesium CallbackProperty for efficient position updates
 * This uses the incremental approach like ASTRIA for minimal computation
 */
export function createKeplerPositionCallback(
  orbitalElements: ReturnType<typeof parseTLEOrbitalElements>
) {
  // Pre-compute constant values
  const { semiMajorAxis, eccentricity, inclination, raan, argOfPerigee, meanMotion } = orbitalElements;

  // Starting mean anomaly at epoch
  let currentMeanAnomaly = orbitalElements.meanAnomalyAtEpoch;
  let lastUpdateTime = orbitalElements.epochDate.getTime();

  return new Cesium.CallbackProperty((time: Cesium.JulianDate | undefined) => {
    if (!time) {
      // Return default position if time is undefined
      const eccentricAnomaly = solveEccentricAnomaly(currentMeanAnomaly, eccentricity, 1e-3);
      const [x, y, z] = orbitalElementsToCartesian(
        semiMajorAxis,
        eccentricity,
        inclination,
        raan,
        argOfPerigee,
        eccentricAnomaly
      );
      return new Cesium.Cartesian3(x, y, z);
    }

    const currentTime = Cesium.JulianDate.toDate(time).getTime();
    const deltaTimeSec = (currentTime - lastUpdateTime) / 1000;

    // Incremental mean anomaly update (ASTRIA approach)
    currentMeanAnomaly = (currentMeanAnomaly + meanMotion * deltaTimeSec) % TwoPi;
    lastUpdateTime = currentTime;

    // Solve for eccentric anomaly
    const eccentricAnomaly = solveEccentricAnomaly(currentMeanAnomaly, eccentricity, 1e-3);

    // Convert to Cartesian
    const [x, y, z] = orbitalElementsToCartesian(
      semiMajorAxis,
      eccentricity,
      inclination,
      raan,
      argOfPerigee,
      eccentricAnomaly
    );

    return new Cesium.Cartesian3(x, y, z);
  }, false);
}
