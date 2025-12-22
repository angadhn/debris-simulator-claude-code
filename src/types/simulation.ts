export type ViewMode = 'orbital' | 'simulation';

export interface CollisionScenario {
  object1: {
    geometry: 'sphere' | 'cylinder' | 'box';
    dimensions: { 
      radius?: number; 
      length?: number; 
      width?: number; 
      height?: number; 
    };
    mass: number;
    velocity: [number, number, number];        // relative, m/s
    angularVelocity: [number, number, number]; // tumbling, rad/s
  };
  object2: {
    geometry: 'sphere' | 'cylinder' | 'box';
    dimensions: { 
      radius?: number; 
      length?: number; 
      width?: number; 
      height?: number; 
    };
    mass: number;
    velocity: [number, number, number];        // relative, m/s
    angularVelocity: [number, number, number]; // tumbling, rad/s
  };
  impactParameter: number;  // miss distance if they were points, meters
}