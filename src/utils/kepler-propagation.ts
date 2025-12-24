import * as Cesium from 'cesium';
import * as satellite from 'satellite.js';

/**
 * Kepler orbit propagation utilities
 *
 * IMPORTANT: This implementation uses OSCULATING orbital elements derived from
 * SGP4-propagated state vectors at the TLE epoch, NOT the TLE mean elements directly.
 *
 * TLE mean elements are fitted specifically for SGP4's perturbation model and cannot
 * be used directly as Keplerian orbital elements. Using them directly causes immediate
 * divergence, not just gradual drift from missing perturbations.
 *
 * The proper approach (implemented here):
 * 1. Use SGP4 to get position/velocity (ECI) at TLE epoch
 * 2. Convert state vector to osculating Keplerian elements via RV2COE algorithm
 * 3. Use those osculating elements for 2-body Kepler propagation
 *
 * Reference: Vallado, "Fundamentals of Astrodynamics and Applications", Algorithm 9 (RV2COE)
 */

const TwoPi = 2 * Math.PI;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const GM = 398600.4418; // km^3/s^2 (Earth's gravitational parameter)

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
 * Vector magnitude
 */
function vecMag(v: number[]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

/**
 * Vector dot product
 */
function vecDot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Vector cross product
 */
function vecCross(a: number[], b: number[]): number[] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

/**
 * Vector scale
 */
function vecScale(v: number[], s: number): number[] {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/**
 * Vector subtraction
 */
function vecSub(a: number[], b: number[]): number[] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * RV2COE: Convert position/velocity state vector to classical orbital elements
 *
 * Implementation of Vallado's Algorithm 9 (RV2COE)
 * Reference: "Fundamentals of Astrodynamics and Applications", 4th Edition
 *
 * @param r Position vector in ECI frame [km]
 * @param v Velocity vector in ECI frame [km/s]
 * @returns Osculating Keplerian orbital elements
 */
export function rv2coe(
  r: number[],
  v: number[]
): {
  semiMajorAxis: number;       // km
  eccentricity: number;
  inclination: number;         // degrees
  raan: number;               // degrees
  argOfPerigee: number;       // degrees
  trueAnomaly: number;        // radians
  meanAnomaly: number;        // radians
  meanMotion: number;         // rad/s
} {
  const rMag = vecMag(r);
  const vMag = vecMag(v);

  // Specific angular momentum vector: h = r × v
  const h = vecCross(r, v);
  const hMag = vecMag(h);

  // Node vector: n = k × h (where k = [0, 0, 1])
  const n = [-h[1], h[0], 0];
  const nMag = vecMag(n);

  // Eccentricity vector: e = ((v² - μ/r) * r - (r·v) * v) / μ
  const vSq = vMag * vMag;
  const rdotv = vecDot(r, v);
  const term1 = vecScale(r, vSq - GM / rMag);
  const term2 = vecScale(v, rdotv);
  const eVec = vecScale(vecSub(term1, term2), 1 / GM);
  const eccentricity = vecMag(eVec);

  // Specific mechanical energy: ε = v²/2 - μ/r
  const energy = vSq / 2 - GM / rMag;

  // Semi-major axis: a = -μ / (2ε)
  let semiMajorAxis: number;
  if (Math.abs(eccentricity - 1.0) > 1e-10) {
    semiMajorAxis = -GM / (2 * energy);
  } else {
    // Parabolic orbit (edge case)
    semiMajorAxis = Infinity;
  }

  // Inclination: i = acos(h_z / |h|)
  const inclination = Math.acos(Math.max(-1, Math.min(1, h[2] / hMag))) * RAD_TO_DEG;

  // Right Ascension of Ascending Node (RAAN): Ω = acos(n_x / |n|)
  let raan = 0;
  if (nMag > 1e-10) {
    raan = Math.acos(Math.max(-1, Math.min(1, n[0] / nMag))) * RAD_TO_DEG;
    if (n[1] < 0) {
      raan = 360 - raan;
    }
  }

  // Argument of perigee: ω = acos(n · e / (|n| |e|))
  let argOfPerigee = 0;
  if (nMag > 1e-10 && eccentricity > 1e-10) {
    const ndote = vecDot(n, eVec);
    argOfPerigee = Math.acos(Math.max(-1, Math.min(1, ndote / (nMag * eccentricity)))) * RAD_TO_DEG;
    if (eVec[2] < 0) {
      argOfPerigee = 360 - argOfPerigee;
    }
  }

  // True anomaly: ν = acos(e · r / (|e| |r|))
  let trueAnomaly = 0;
  if (eccentricity > 1e-10) {
    const edotr = vecDot(eVec, r);
    trueAnomaly = Math.acos(Math.max(-1, Math.min(1, edotr / (eccentricity * rMag))));
    if (rdotv < 0) {
      trueAnomaly = TwoPi - trueAnomaly;
    }
  } else {
    // Circular orbit: use argument of latitude
    const ndotr = vecDot(n, r);
    if (nMag > 1e-10) {
      trueAnomaly = Math.acos(Math.max(-1, Math.min(1, ndotr / (nMag * rMag))));
      if (r[2] < 0) {
        trueAnomaly = TwoPi - trueAnomaly;
      }
    }
  }

  // Convert true anomaly to eccentric anomaly
  // E = atan2(sqrt(1-e²) * sin(ν), e + cos(ν))
  const sinNu = Math.sin(trueAnomaly);
  const cosNu = Math.cos(trueAnomaly);
  const sqrtOneMinusE2 = Math.sqrt(1 - eccentricity * eccentricity);
  const eccentricAnomaly = Math.atan2(sqrtOneMinusE2 * sinNu, eccentricity + cosNu);

  // Convert eccentric anomaly to mean anomaly
  // M = E - e * sin(E)
  let meanAnomaly = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly);
  if (meanAnomaly < 0) {
    meanAnomaly += TwoPi;
  }

  // Mean motion: n = sqrt(μ / a³)
  const meanMotion = Math.sqrt(GM / Math.pow(semiMajorAxis, 3));

  return {
    semiMajorAxis,
    eccentricity,
    inclination,
    raan,
    argOfPerigee,
    trueAnomaly,
    meanAnomaly,
    meanMotion
  };
}

/**
 * Parse TLE and compute OSCULATING orbital elements at a reference time
 *
 * This function:
 * 1. Parses the TLE using satellite.js
 * 2. Uses SGP4 to propagate to the reference time to get position/velocity
 * 3. Converts the resulting state vector to osculating Keplerian elements via RV2COE
 *
 * By default, uses the CURRENT TIME as the reference (not TLE epoch).
 * This ensures SGP4 and Kepler show the same position when switching modes,
 * with divergence only occurring as time progresses forward.
 *
 * @param line1 TLE line 1
 * @param line2 TLE line 2
 * @param referenceTime Optional reference time (defaults to current time)
 */
export function parseTLEOrbitalElements(line1: string, line2: string, referenceTime?: Date) {
  // Parse TLE using satellite.js
  const satrec = satellite.twoline2satrec(line1, line2);

  // Use reference time (default to NOW) instead of TLE epoch
  // This ensures Kepler and SGP4 match at the moment of switching modes
  const epochDate = referenceTime || new Date();

  // Use SGP4 to get position/velocity at reference time
  const positionAndVelocity = satellite.propagate(satrec, epochDate);

  // Check for propagation errors
  if (
    !positionAndVelocity ||
    typeof positionAndVelocity.position === 'boolean' ||
    !positionAndVelocity.position ||
    typeof positionAndVelocity.velocity === 'boolean' ||
    !positionAndVelocity.velocity
  ) {
    // Fallback to TLE mean elements if SGP4 fails at epoch
    console.warn('SGP4 propagation failed at epoch, using TLE mean elements as fallback');
    return parseTLEMeanElements(line1, line2);
  }

  const positionEci = positionAndVelocity.position;
  const velocityEci = positionAndVelocity.velocity;

  // Convert to arrays for RV2COE (already in km and km/s)
  const r = [positionEci.x, positionEci.y, positionEci.z];
  const v = [velocityEci.x, velocityEci.y, velocityEci.z];

  // Convert state vector to osculating orbital elements
  const osculatingElements = rv2coe(r, v);

  // DEBUG: Verify round-trip accuracy at epoch
  const debugElements = {
    epochDate,
    semiMajorAxis: osculatingElements.semiMajorAxis,
    eccentricity: osculatingElements.eccentricity,
    inclination: osculatingElements.inclination,
    raan: osculatingElements.raan,
    argOfPerigee: osculatingElements.argOfPerigee,
    meanAnomalyAtEpoch: osculatingElements.meanAnomaly,
    meanMotion: osculatingElements.meanMotion,
  };

  // Compute position at epoch using Kepler and compare to SGP4
  const keplerAtEpoch = propagateKeplerPositionInternal(debugElements, epochDate);
  const sgp4Pos = [r[0] * 1000, r[1] * 1000, r[2] * 1000]; // Convert to meters

  const posDiff = Math.sqrt(
    Math.pow(keplerAtEpoch[0] - sgp4Pos[0], 2) +
    Math.pow(keplerAtEpoch[1] - sgp4Pos[1], 2) +
    Math.pow(keplerAtEpoch[2] - sgp4Pos[2], 2)
  );

  if (posDiff > 1000) { // More than 1 km difference at epoch
    console.warn(`[Kepler Init] Large position difference at epoch: ${(posDiff/1000).toFixed(2)} km`);
    console.warn(`  SGP4 pos (km): [${r[0].toFixed(2)}, ${r[1].toFixed(2)}, ${r[2].toFixed(2)}]`);
    console.warn(`  Kepler pos (km): [${(keplerAtEpoch[0]/1000).toFixed(2)}, ${(keplerAtEpoch[1]/1000).toFixed(2)}, ${(keplerAtEpoch[2]/1000).toFixed(2)}]`);
    console.warn(`  Osculating elements:`, {
      a: osculatingElements.semiMajorAxis.toFixed(2),
      e: osculatingElements.eccentricity.toFixed(6),
      i: osculatingElements.inclination.toFixed(4),
      raan: osculatingElements.raan.toFixed(4),
      argP: osculatingElements.argOfPerigee.toFixed(4),
      M0: (osculatingElements.meanAnomaly * 180 / Math.PI).toFixed(4),
    });
  }

  return debugElements;
}

/**
 * Internal version of propagateKeplerPosition for debugging
 */
function propagateKeplerPositionInternal(
  orbitalElements: {
    epochDate: Date;
    semiMajorAxis: number;
    eccentricity: number;
    inclination: number;
    raan: number;
    argOfPerigee: number;
    meanAnomalyAtEpoch: number;
    meanMotion: number;
  },
  time: Date
): [number, number, number] {
  const elapsedTimeSec = (time.getTime() - orbitalElements.epochDate.getTime()) / 1000;
  let meanAnomaly = (orbitalElements.meanAnomalyAtEpoch + orbitalElements.meanMotion * elapsedTimeSec) % TwoPi;
  if (meanAnomaly < 0) meanAnomaly += TwoPi;

  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, orbitalElements.eccentricity, 1e-6);

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
 * Fallback: Parse TLE mean elements directly (DEPRECATED - only for error fallback)
 *
 * WARNING: TLE mean elements are fitted for SGP4 and should NOT be used directly
 * as Keplerian elements. This function exists only as a fallback when SGP4 fails.
 */
function parseTLEMeanElements(line1: string, line2: string) {
  // Line 1: Epoch
  const epochStr = line1.substring(18, 32).trim();
  const year2digit = parseInt(epochStr.substring(0, 2));
  const year = year2digit >= 57 ? 1900 + year2digit : 2000 + year2digit;
  const dayOfYear = parseFloat(epochStr.substring(2));
  const epochDate = new Date(Date.UTC(year, 0, 1));
  epochDate.setUTCDate(dayOfYear);

  // Line 2: Orbital elements (mean elements - not osculating!)
  const inclination = parseFloat(line2.substring(8, 16).trim());
  const raan = parseFloat(line2.substring(17, 25).trim());
  const eccentricityStr = line2.substring(26, 33).trim();
  const eccentricity = parseFloat('0.' + eccentricityStr);
  const argOfPerigee = parseFloat(line2.substring(34, 42).trim());
  const meanAnomalyDeg = parseFloat(line2.substring(43, 51).trim());
  const meanMotion = parseFloat(line2.substring(52, 63).trim());

  const meanMotionRadPerSec = (meanMotion * TwoPi) / 86400;
  const semiMajorAxis = Math.pow(GM / (meanMotionRadPerSec * meanMotionRadPerSec), 1/3);

  return {
    epochDate,
    semiMajorAxis,
    eccentricity,
    inclination,
    raan,
    argOfPerigee,
    meanAnomalyAtEpoch: meanAnomalyDeg * DEG_TO_RAD,
    meanMotion: meanMotionRadPerSec,
  };
}

/**
 * Calculate position at a given time using Kepler propagation
 *
 * @param orbitalElements Orbital elements from parseTLEOrbitalElements
 * @param time Current time
 * @returns Position in ECEF coordinates [x, y, z] in meters (compatible with Cesium)
 */
export function propagateKeplerPosition(
  orbitalElements: ReturnType<typeof parseTLEOrbitalElements>,
  time: Date
): [number, number, number] {
  // Calculate elapsed time since epoch in seconds
  const elapsedTimeSec = (time.getTime() - orbitalElements.epochDate.getTime()) / 1000;

  // Update mean anomaly: M = M0 + n*t
  let meanAnomaly = (orbitalElements.meanAnomalyAtEpoch +
                      orbitalElements.meanMotion * elapsedTimeSec) % TwoPi;
  if (meanAnomaly < 0) meanAnomaly += TwoPi;

  // Solve for eccentric anomaly
  const eccentricAnomaly = solveEccentricAnomaly(
    meanAnomaly,
    orbitalElements.eccentricity,
    1e-3 // Fast tolerance like ASTRIA
  );

  // Convert to Cartesian coordinates (ECI frame, in meters)
  const [xEci, yEci, zEci] = orbitalElementsToCartesian(
    orbitalElements.semiMajorAxis,
    orbitalElements.eccentricity,
    orbitalElements.inclination,
    orbitalElements.raan,
    orbitalElements.argOfPerigee,
    eccentricAnomaly
  );

  // Convert ECI to ECEF (Earth-Centered Earth-Fixed) for Cesium compatibility
  const gmst = satellite.gstime(time);
  const cosGmst = Math.cos(gmst);
  const sinGmst = Math.sin(gmst);

  // Rotation from ECI to ECEF (rotation around Z-axis by GMST)
  const xEcef = cosGmst * xEci + sinGmst * yEci;
  const yEcef = -sinGmst * xEci + cosGmst * yEci;
  const zEcef = zEci; // Z unchanged

  return [xEcef, yEcef, zEcef];
}

/**
 * Generate orbit path using Kepler propagation
 * Returns array of ECEF positions for one complete orbit
 */
export function generateKeplerOrbitPath(
  orbitalElements: ReturnType<typeof parseTLEOrbitalElements>,
  startTime: Date,
  durationSeconds: number,
  stepSeconds: number = 30
): Cesium.Cartesian3[] {
  const positions: Cesium.Cartesian3[] = [];
  const numSteps = Math.floor(durationSeconds / stepSeconds);

  for (let i = 0; i <= numSteps; i++) {
    const time = new Date(startTime.getTime() + i * stepSeconds * 1000);
    const [x, y, z] = propagateKeplerPosition(orbitalElements, time);
    positions.push(new Cesium.Cartesian3(x, y, z));
  }

  return positions;
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
