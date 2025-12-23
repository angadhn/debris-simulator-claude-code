export interface DebrisObject {
  noradId: number;
  name: string;
  objectType: 'PAYLOAD' | 'ROCKET_BODY' | 'DEBRIS' | 'UNKNOWN';
  tle: {
    line1: string;
    line2: string;
  };
  // Computed from TLE
  position?: [number, number, number];      // Current ECI position
  orbitPeriod?: number;                     // seconds
  inclination?: number;                     // degrees
  apogee?: number;                          // km
  perigee?: number;                         // km
  rcsSize?: string;                         // Radar Cross Section: SMALL, MEDIUM, LARGE
  countryCode?: string;                     // Country/Organization code (US, CIS, PRC, etc.)
}

export interface OrbitData {
  positions: [number, number, number][];   // Array of ECI positions
  timestamps: Date[];                       // Corresponding timestamps
  period: number;                           // Orbital period in seconds
}