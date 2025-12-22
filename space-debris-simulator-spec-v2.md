# Space Debris Visualization & Capture Simulation Platform
## Development Specification v2

**Project Goal**: Build a browser-based platform that visualizes real space debris from Space-Track data, simulates object collisions, and allows users to design and test debris capture/removal systems (nets, robotic grippers, etc.) through a chat interface.

**Key Design Decisions**:
- **CesiumJS** for orbital/Earth visualization (purpose-built for space applications)
- **Three.js** for close-up physics simulation view (gripper operations)
- **MuJoCo WASM** for contact physics (research-grade, runs free in browser)
- **Server-side MuJoCo** as optional upgrade (requires user account, future implementation)
- Hybrid browser + cloud architecture for flexible body FEM (Phase 3)

---

# TECHNOLOGY OVERVIEW

## Why CesiumJS for Orbital Visualization

CesiumJS is a JavaScript library created by AGI (makers of STK) specifically for 3D geospatial and space visualization. Unlike Three.js where you build everything from scratch, Cesium provides aerospace-specific features out of the box:

| Feature | CesiumJS | Three.js |
|---------|----------|----------|
| Earth model | WGS84 ellipsoid built-in | Build from scratch |
| Satellite trajectories | Native CZML format | Manual implementation |
| Time-dynamic animation | Built-in clock/timeline | Manual implementation |
| Coordinate systems | ECI/ECEF/geodetic transforms | Manual implementation |
| Large object counts | Optimized for 100k+ points | Requires custom optimization |
| Imagery/terrain | Streaming tiles built-in | Manual or external library |

**Use Cesium for**: Global debris view, orbit paths, Earth visualization, time controls
**Use Three.js for**: Close-up physics simulation, gripper mechanics, contact visualization

The application has two main views:
1. **Orbital View (Cesium)**: See all debris, select targets, visualize orbits
2. **Simulation View (Three.js + MuJoCo)**: Run physics, test capture systems

## Why MuJoCo for Physics

MuJoCo (Multi-Joint dynamics with Contact) is the physics engine used by DeepMind and robotics researchers worldwide. Since being open-sourced under Apache 2.0 in 2022, it's become the standard for contact-rich manipulation simulation.

**Why not Rapier/Cannon.js/other browser physics engines?**
- MuJoCo's contact solver is designed for robotic grasping—grippers actually hold objects stably
- Game physics engines optimize for visual plausibility, not mechanical accuracy
- MuJoCo handles the mass ratios and friction models needed for capture simulation

**MuJoCo WASM**: MuJoCo compiles to WebAssembly and runs entirely in the browser. This means:
- Zero server costs for physics
- No latency (runs on user's device)
- Research-grade contact dynamics for free

**Server-side MuJoCo** (future feature): For users who want:
- Guaranteed performance regardless of their device
- Parallel simulation runs
- Longer/more complex simulations
This requires user accounts and payment (cloud compute costs ~$0.10-0.17/hour).

---

# TECH STACK

```
Frontend:
├── React 18 + TypeScript
├── Vite (build tool)
├── CesiumJS (orbital visualization)
├── Three.js + @react-three/fiber (physics visualization)
├── MuJoCo WASM (contact physics - browser)
├── Zustand (state management)
└── Tailwind CSS (styling)

Backend (minimal):
├── Node.js + Express (or serverless functions)
├── Space-Track proxy (TLE data fetching)
└── [Future] MuJoCo server for paid tier

Data:
├── Space-Track.org API (debris catalog via TLE)
├── CelesTrak (backup/alternative)
└── satellite.js (SGP4/SDP4 propagation)
```

---

# PROJECT STRUCTURE

```
/src
  /components
    /cesium
      OrbitalViewer.tsx       # Main Cesium globe component
      DebrisLayer.tsx         # Instanced debris points
      OrbitPaths.tsx          # Selected object trajectory
      TimelineControls.tsx    # Cesium timeline/clock
      TargetSelector.tsx      # Click-to-select debris
    /simulation
      SimulationViewer.tsx    # Three.js physics scene
      MuJoCoWorld.tsx         # MuJoCo WASM integration
      CaptureSystem.tsx       # Gripper/net visualization
      ContactVisualizer.tsx   # Show contact points/forces
      PhysicsControls.tsx     # Play/pause/step physics
    /ui
      ViewSwitcher.tsx        # Toggle Orbital ↔ Simulation view
      Sidebar.tsx             # Object info panel
      ChatInterface.tsx       # Command input
      PhysicsServerToggle.tsx # Client/Server physics selector
      SearchBar.tsx           # Find debris by NORAD ID
    /capture-systems
      GripperBuilder.tsx      # Configure robotic gripper
      NetBuilder.tsx          # Configure capture net
      SystemLibrary.tsx       # Pre-built templates
  /hooks
    useCesiumViewer.ts
    useDebrisData.ts
    useMuJoCo.ts
    useOrbitalPropagation.ts
  /services
    spacetrack-api.ts         # Backend proxy calls
    mujoco-loader.ts          # WASM initialization
    tle-parser.ts
  /stores
    debris-store.ts           # Debris catalog state
    simulation-store.ts       # Physics simulation state
    ui-store.ts               # View state, selections
  /utils
    coordinates.ts            # ECI/ECEF/geodetic transforms
    czml-generator.ts         # Generate Cesium CZML from TLEs
    mjcf-generator.ts         # Generate MuJoCo XML models
  /types
    debris.ts
    simulation.ts
    capture-systems.ts
  App.tsx
  main.tsx

/server
  index.ts                    # Express server
  space-track-client.ts       # Space-Track authentication
  /routes
    tle.ts                    # GET /api/tle/:catalog

/public
  /mujoco                     # MuJoCo WASM files
  /textures                   # Earth textures (if needed beyond Cesium)
  /models                     # Pre-built MJCF capture system models
```

---

# PHASE 1: Debris Visualization with Collision Demo

## 1.1 Objectives
- Render Earth with real debris positions from Space-Track
- Allow selection of debris objects with orbit visualization
- Demonstrate two-object collision with debris generation
- Establish the dual-view architecture (Cesium + Three.js)

## 1.2 Cesium Orbital View

### Setup CesiumJS
```typescript
// Install: npm install cesium resium
// resium provides React bindings for Cesium

// Key configuration:
// - Get free Cesium ion access token at https://cesium.com/ion/
// - Set VITE_CESIUM_ION_TOKEN in .env
```

### Debris Visualization
```typescript
interface DebrisObject {
  noradId: number;
  name: string;
  objectType: 'PAYLOAD' | 'ROCKET_BODY' | 'DEBRIS' | 'UNKNOWN';
  tle: {
    line1: string;
    line2: string;
  };
  // Computed from TLE
  position?: Cartesian3;      // Current ECI position
  orbitPeriod?: number;       // seconds
  inclination?: number;       // degrees
  apogee?: number;            // km
  perigee?: number;           // km
}
```

### Implementation Steps

1. **Backend: Space-Track Proxy**
   - Space-Track requires authentication and blocks CORS
   - Create `/api/tle` endpoint that fetches and caches TLE data
   - Cache for 24 hours (TLEs update roughly daily)
   - Start with "active" catalog (~8,000 objects)

2. **Cesium Globe Setup**
   - Initialize Cesium Viewer with ion imagery
   - Configure clock for real-time or simulated time
   - Set up camera controls (orbit, zoom, pan)

3. **Debris Rendering with CZML**
   - CZML is Cesium's native format for time-dynamic data
   - Generate CZML from TLEs using satellite.js for propagation
   - Render as PointPrimitiveCollection for performance
   - Color by object type: payload (white), rocket body (red), debris (gray)

4. **Selection and Information**
   - Click handler to select debris points
   - Show info panel with orbital parameters
   - Draw orbit path for selected object (propagate ±1 period)
   - Highlight nearby objects (conjunction candidates)

5. **Time Controls**
   - Use Cesium's built-in Timeline and Animation widgets
   - Add custom speed controls: 1x, 10x, 100x, 1000x
   - Jump-to-time input

### Key Code Pattern: CZML Generation
```typescript
import * as satellite from 'satellite.js';

function generateDebrisCZML(debris: DebrisObject[], startTime: Date, duration: number): object {
  const czml = [
    {
      id: 'document',
      name: 'Space Debris',
      version: '1.0',
      clock: {
        interval: `${startTime.toISOString()}/${new Date(startTime.getTime() + duration * 1000).toISOString()}`,
        currentTime: startTime.toISOString(),
        multiplier: 1
      }
    }
  ];

  for (const obj of debris) {
    const satrec = satellite.twoline2satrec(obj.tle.line1, obj.tle.line2);
    
    // Sample positions over time
    const positions: number[] = [];
    const step = 60; // seconds between samples
    
    for (let t = 0; t < duration; t += step) {
      const time = new Date(startTime.getTime() + t * 1000);
      const positionAndVelocity = satellite.propagate(satrec, time);
      
      if (positionAndVelocity.position) {
        const gmst = satellite.gstime(time);
        const geo = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
        
        positions.push(
          t,                                    // time offset
          geo.longitude * (180 / Math.PI),     // degrees
          geo.latitude * (180 / Math.PI),      // degrees
          geo.height * 1000                     // meters
        );
      }
    }

    czml.push({
      id: `debris-${obj.noradId}`,
      name: obj.name,
      position: {
        interpolationAlgorithm: 'LAGRANGE',
        interpolationDegree: 5,
        referenceFrame: 'INERTIAL',
        epoch: startTime.toISOString(),
        cartographicDegrees: positions
      },
      point: {
        color: { rgba: getColorForType(obj.objectType) },
        pixelSize: 3
      },
      properties: {
        noradId: obj.noradId,
        objectType: obj.objectType,
        inclination: obj.inclination,
        apogee: obj.apogee,
        perigee: obj.perigee
      }
    });
  }

  return czml;
}
```

## 1.3 Three.js Simulation View

For the collision demonstration and later physics work, use Three.js:

### View Switching
```typescript
type ViewMode = 'orbital' | 'simulation';

// User can switch between:
// - Orbital View: Cesium globe showing all debris
// - Simulation View: Three.js scene for physics

// When entering Simulation View:
// 1. Take selected debris object(s) from Cesium
// 2. Create Three.js scene centered on that region
// 3. Initialize MuJoCo world with those objects
```

### Collision Demo Scene
For Phase 1, create a simplified collision demonstration:

1. **Scene Setup**
   - Dark space background with star field
   - Two debris objects (user-configurable geometry)
   - Relative velocity indicator
   - Collision countdown

2. **Object Creation UI**
   ```typescript
   interface CollisionScenario {
     object1: {
       geometry: 'sphere' | 'cylinder' | 'box';
       dimensions: { radius?: number; length?: number; width?: number; height?: number };
       mass: number;
       velocity: [number, number, number];  // relative, m/s
       angularVelocity: [number, number, number];  // tumbling, rad/s
     };
     object2: { /* same structure */ };
     impactParameter: number;  // miss distance if they were points, meters
   }
   ```

3. **Physics with MuJoCo WASM**
   - Load mujoco_wasm (reference: https://github.com/zalo/mujoco_wasm)
   - Create MJCF model for the scenario
   - Run simulation, render state to Three.js
   - On collision: generate debris fragments

4. **Visualization**
   - Slow-motion replay of collision
   - Show impact energy, relative velocity
   - Visualize fragment spray pattern
   - Color-code fragments by velocity

### MuJoCo WASM Integration Pattern
```typescript
// mujoco-loader.ts
import load_mujoco from 'mujoco-wasm';

let mj: any = null;
let model: any = null;
let state: any = null;

export async function initMuJoCo() {
  mj = await load_mujoco();
  console.log('MuJoCo WASM loaded');
}

export function loadModel(mjcfXml: string) {
  model = mj.Model.load_from_xml(mjcfXml);
  state = new mj.State(model);
}

export function step(dt: number) {
  mj.step(model, state);
}

export function getBodyPositions(): Map<string, [number, number, number]> {
  const positions = new Map();
  for (let i = 0; i < model.nbody; i++) {
    const name = model.body(i).name;
    const pos = state.xpos.slice(i * 3, i * 3 + 3);
    positions.set(name, [pos[0], pos[1], pos[2]]);
  }
  return positions;
}

export function getBodyQuaternions(): Map<string, [number, number, number, number]> {
  const quaternions = new Map();
  for (let i = 0; i < model.nbody; i++) {
    const name = model.body(i).name;
    const quat = state.xquat.slice(i * 4, i * 4 + 4);
    quaternions.set(name, [quat[0], quat[1], quat[2], quat[3]]);
  }
  return quaternions;
}
```

## 1.4 Basic Chat Interface

Create a text input that parses commands. Start with regex-based parsing; LLM integration comes later.

```typescript
// Supported Phase 1 commands:
const COMMANDS = {
  // Orbital view
  'focus <norad_id>': 'Center camera on debris object',
  'show orbit <norad_id>': 'Draw orbital path',
  'find <name>': 'Search debris by name',
  'time <speed>': 'Set time multiplier (1x, 10x, 100x)',
  'goto <datetime>': 'Jump to specific time',
  
  // Simulation view
  'simulate collision': 'Open collision demo',
  'create sphere <radius>m <mass>kg': 'Add spherical debris',
  'create cylinder <length>m <diameter>m': 'Add cylindrical debris',
  'set velocity <x> <y> <z> m/s': 'Set object velocity',
  'run': 'Start physics simulation',
  'pause': 'Pause simulation',
  'reset': 'Reset to initial state',
};
```

## 1.5 Phase 1 Deliverables

- [ ] Cesium globe with Earth imagery
- [ ] Space-Track proxy backend
- [ ] Debris catalog fetch and cache
- [ ] CZML generation from TLEs
- [ ] Render 5,000+ debris as points
- [ ] Object selection with info panel
- [ ] Orbit path visualization
- [ ] Time controls (play/pause/speed/jump)
- [ ] View switcher (Orbital ↔ Simulation)
- [ ] Three.js simulation scene
- [ ] MuJoCo WASM loading and initialization
- [ ] Two-object collision scenario builder
- [ ] Collision physics and fragment generation
- [ ] Basic text command interface
- [ ] Responsive layout

---

# PHASE 2: Capture System Simulation with MuJoCo

## 2.1 Objectives
- Design and simulate robotic capture systems (grippers, arms)
- Use MuJoCo's contact dynamics for realistic grasping
- Support both browser-side (free) and server-side (paid) physics
- Implement proximity operations (approach, capture, detumble)

## 2.2 Physics Engine Selection UI

```typescript
type PhysicsMode = 'browser' | 'server';

interface PhysicsSettings {
  mode: PhysicsMode;
  // Browser mode: MuJoCo WASM, free, runs on user device
  // Server mode: MuJoCo on cloud, requires account, ~$0.10-0.17/hr
}

// UI Component: PhysicsServerToggle
// - Default: Browser (free)
// - Server option: Shows "Requires account" tooltip
// - Clicking Server when not logged in → prompt to create account
// - Account creation and payment integration: FUTURE IMPLEMENTATION
//   (For now, server toggle shows "Coming soon" message)
```

### Why Two Modes?
| Aspect | Browser (MuJoCo WASM) | Server (MuJoCo Cloud) |
|--------|----------------------|----------------------|
| Cost | Free | ~$0.10-0.17/hour |
| Performance | Depends on user's device | Consistent, fast |
| Latency | Zero (local) | 50-100ms round-trip |
| Complex scenes | May struggle on weak devices | Handles heavy loads |
| Availability | Always | Requires account + payment |

**For Phase 2, implement browser mode fully. Server mode UI exists but shows "Coming soon—requires account".**

## 2.3 Capture System Definition

### MJCF Model Generation
MuJoCo uses MJCF (XML) format for model definition. Generate these programmatically:

```typescript
interface CaptureSystem {
  id: string;
  name: string;
  type: 'gripper' | 'arm' | 'net_launcher';
  
  // For robotic arm/gripper
  joints?: Joint[];
  links?: Link[];
  endEffector?: EndEffector;
  
  // For net (Phase 3)
  net?: NetConfiguration;
}

interface Joint {
  name: string;
  type: 'revolute' | 'prismatic' | 'ball' | 'fixed';
  axis: [number, number, number];
  range: [number, number];  // joint limits
  damping: number;
  stiffness?: number;
  actuated: boolean;
}

interface Link {
  name: string;
  parentJoint: string;
  geometry: 'box' | 'cylinder' | 'capsule' | 'mesh';
  dimensions: Record<string, number>;
  mass: number;
  inertia?: [number, number, number];  // diagonal
}

interface EndEffector {
  type: 'parallel_gripper' | 'three_finger' | 'gecko' | 'magnetic';
  fingerCount?: number;
  fingerLength?: number;
  maxGripForce?: number;
  aperture?: number;  // max opening
}
```

### MJCF Generator
```typescript
function generateGripperMJCF(config: CaptureSystem): string {
  return `
<mujoco model="${config.name}">
  <option gravity="0 0 0" timestep="0.002"/>
  
  <default>
    <joint damping="0.5" armature="0.1"/>
    <geom friction="1.0 0.005 0.001" condim="4"/>
  </default>
  
  <worldbody>
    <!-- Chaser spacecraft base -->
    <body name="chaser" pos="0 0 0">
      <freejoint name="chaser_free"/>
      <geom type="box" size="0.5 0.3 0.2" mass="500"/>
      
      <!-- Arm base -->
      <body name="arm_base" pos="0.5 0 0">
        <joint name="shoulder_yaw" type="hinge" axis="0 0 1" range="-180 180"/>
        <geom type="cylinder" size="0.05 0.1" mass="10"/>
        
        <body name="upper_arm" pos="0.1 0 0">
          <joint name="shoulder_pitch" type="hinge" axis="0 1 0" range="-90 90"/>
          <geom type="capsule" size="0.04" fromto="0 0 0 0.4 0 0" mass="5"/>
          
          <body name="forearm" pos="0.4 0 0">
            <joint name="elbow" type="hinge" axis="0 1 0" range="-135 0"/>
            <geom type="capsule" size="0.03" fromto="0 0 0 0.3 0 0" mass="3"/>
            
            <!-- Gripper -->
            <body name="gripper_base" pos="0.3 0 0">
              <joint name="wrist" type="hinge" axis="0 0 1" range="-180 180"/>
              <geom type="box" size="0.05 0.08 0.02" mass="2"/>
              
              <!-- Finger 1 -->
              <body name="finger1" pos="0 0.06 0">
                <joint name="finger1_joint" type="slide" axis="0 1 0" range="0 0.1"/>
                <geom type="box" size="0.04 0.01 0.06" mass="0.5"/>
              </body>
              
              <!-- Finger 2 -->
              <body name="finger2" pos="0 -0.06 0">
                <joint name="finger2_joint" type="slide" axis="0 -1 0" range="0 0.1"/>
                <geom type="box" size="0.04 0.01 0.06" mass="0.5"/>
              </body>
            </body>
          </body>
        </body>
      </body>
    </body>
    
    <!-- Target debris -->
    <body name="debris" pos="2 0 0">
      <freejoint name="debris_free"/>
      <geom type="cylinder" size="0.3 0.8" mass="1000"/>
      <!-- Initial angular velocity for tumbling -->
    </body>
  </worldbody>
  
  <actuator>
    <motor name="shoulder_yaw_motor" joint="shoulder_yaw" ctrlrange="-50 50"/>
    <motor name="shoulder_pitch_motor" joint="shoulder_pitch" ctrlrange="-50 50"/>
    <motor name="elbow_motor" joint="elbow" ctrlrange="-30 30"/>
    <motor name="wrist_motor" joint="wrist" ctrlrange="-20 20"/>
    <motor name="finger1_motor" joint="finger1_joint" ctrlrange="-10 10"/>
    <motor name="finger2_motor" joint="finger2_joint" ctrlrange="-10 10"/>
  </actuator>
  
  <sensor>
    <touch name="finger1_touch" site="finger1_site"/>
    <touch name="finger2_touch" site="finger2_site"/>
  </sensor>
</mujoco>
  `;
}
```

## 2.4 Pre-built Capture System Templates

### Template Library
```typescript
const CAPTURE_TEMPLATES = {
  'clearspace-style': {
    name: 'ClearSpace-1 Style 4-Arm',
    description: '4 arms that wrap around target',
    // ... full configuration
  },
  'parallel-gripper': {
    name: 'Simple Parallel Jaw Gripper',
    description: '2-finger gripper on articulated arm',
    // ... full configuration
  },
  'gecko-gripper': {
    name: 'Gecko Adhesive Gripper',
    description: 'Uses dry adhesion, no grip force needed',
    // ... full configuration
  },
  'tentacle': {
    name: 'Flexible Tentacle Arm',
    description: 'Multi-segment arm for wrapping (simplified rigid chain)',
    // ... full configuration
  }
};
```

### Capture System Builder UI
Allow users to customize:
- Number of arms/fingers
- Link lengths and masses
- Joint ranges and torque limits
- End effector type
- Starting configuration

Or describe in chat: "Create a gripper with 4 fingers, each 1.5m long, that can open to 3m diameter"

## 2.5 Proximity Operations Simulation

### Approach Phase
```typescript
interface ApproachTrajectory {
  type: 'v-bar' | 'r-bar' | 'direct';
  holdPoints: HoldPoint[];
  finalApproachVelocity: number;  // m/s
}

interface HoldPoint {
  relativePosition: [number, number, number];  // LVLH frame, meters
  duration: number;  // seconds to hold
}
```

- Visualize chaser approaching debris in LVLH (Local Vertical Local Horizontal) frame
- Show relative velocity, range, closing rate
- Hold points for inspection before final approach

### Capture Phase
- High-fidelity physics (small timestep: 2ms)
- Contact detection between gripper and target
- Grasp sequence: approach → contact → close → confirm grip
- Visualize contact points and forces

### Post-Capture Detumble
- Combined system dynamics (chaser + debris)
- Angular momentum exchange
- Control authority visualization (can we stabilize this?)
- Time to detumble estimate

## 2.6 Chat Commands for Phase 2

```typescript
const PHASE2_COMMANDS = {
  // Capture system creation
  'create gripper <template>': 'Load capture system template',
  'customize gripper': 'Open gripper builder UI',
  'set finger length <meters>': 'Adjust finger dimensions',
  'set grip force <newtons>': 'Set maximum grip force',
  
  // Scenario setup
  'load debris <norad_id>': 'Import real debris as target',
  'set target tumble <deg/s>': 'Set debris rotation rate',
  'position chaser <range>m from target': 'Set initial chaser position',
  
  // Simulation
  'approach target': 'Begin approach sequence',
  'hold position': 'Station-keep at current range',
  'close gripper': 'Execute grasp',
  'detumble': 'Attempt to stabilize combined system',
  
  // Analysis
  'show contact forces': 'Visualize grip forces',
  'show momentum': 'Display angular momentum vectors',
  'can we hold this?': 'Assess grasp stability',
  
  // Physics mode
  'use browser physics': 'Switch to MuJoCo WASM (free)',
  'use server physics': 'Switch to cloud MuJoCo (requires account)',
};
```

## 2.7 Phase 2 Deliverables

- [ ] Physics mode toggle UI (browser/server)
- [ ] Server mode "Coming soon" placeholder
- [ ] MuJoCo WASM full integration
- [ ] MJCF model generator for capture systems
- [ ] Pre-built capture system templates (4+)
- [ ] Capture system customization UI
- [ ] Joint control (position/velocity/torque)
- [ ] Approach trajectory visualization
- [ ] Contact detection and force display
- [ ] Grasp sequence execution
- [ ] Post-capture combined dynamics
- [ ] Detumble simulation
- [ ] Chat commands for capture operations
- [ ] Real debris import (from Cesium selection)

---

# PHASE 3: Flexible Bodies and Cloud FEM

## 3.1 Objectives
- Simulate flexible capture systems (nets, tethers)
- Browser preview using simplified physics (Position-Based Dynamics)
- Cloud FEM for accurate stress analysis
- User accounts and payment for cloud compute

## 3.2 Browser-Side Flexible Body Preview

### Position-Based Dynamics for Nets
Real-time approximation of net dynamics:

```typescript
interface FlexibleNet {
  topology: 'rectangular' | 'hexagonal';
  width: number;       // meters
  height: number;      // meters
  resolution: number;  // nodes per meter
  
  material: {
    density: number;           // kg/m
    stiffness: number;         // N/m
    damping: number;           // ratio
    breakingForce: number;     // N
  };
  
  cornerMasses: {
    mass: number;              // kg
    ejectionVelocity: number;  // m/s
  };
  
  // Generated
  nodes: NetNode[];
  constraints: Constraint[];
}

interface NetNode {
  id: number;
  position: [number, number, number];
  prevPosition: [number, number, number];  // for Verlet
  mass: number;
  fixed: boolean;
}

interface Constraint {
  type: 'distance' | 'bending';
  nodeA: number;
  nodeB: number;
  restLength: number;
}
```

### PBD Solver
```typescript
class PBDSolver {
  private nodes: NetNode[];
  private constraints: Constraint[];
  private iterations: number = 10;
  
  step(dt: number) {
    // Verlet integration
    for (const node of this.nodes) {
      if (node.fixed) continue;
      
      const vel = vec3.subtract(node.position, node.prevPosition);
      node.prevPosition = [...node.position];
      
      // Apply velocity and gravity (zero in space)
      node.position = vec3.add(node.position, vel);
    }
    
    // Solve constraints
    for (let i = 0; i < this.iterations; i++) {
      for (const c of this.constraints) {
        this.solveDistanceConstraint(c);
      }
    }
  }
  
  private solveDistanceConstraint(c: Constraint) {
    const a = this.nodes[c.nodeA];
    const b = this.nodes[c.nodeB];
    
    const delta = vec3.subtract(b.position, a.position);
    const dist = vec3.length(delta);
    const diff = (dist - c.restLength) / dist;
    
    const correction = vec3.scale(delta, diff * 0.5);
    
    if (!a.fixed) a.position = vec3.add(a.position, correction);
    if (!b.fixed) b.position = vec3.subtract(b.position, correction);
  }
}
```

### Net-Debris Contact (Simplified)
- Detect when net nodes penetrate debris bounding geometry
- Apply penalty forces to push nodes out
- "Sticky" contact: nodes that touch debris stay attached
- Visualize tension in threads (color gradient)

## 3.3 Cloud FEM Integration

### Architecture
```
Browser                          Server                         Cloud FEM
┌─────────────────┐             ┌─────────────────┐            ┌─────────────┐
│ PBD Preview     │────────────►│ Job API         │───────────►│ SimScale    │
│ (real-time)     │  Submit     │ POST /fem/jobs  │  Submit    │ or OnScale  │
│                 │  Job        │                 │  via API   │             │
│                 │◄────────────│ GET /fem/jobs/  │◄───────────│             │
│ FEM Results     │  Results    │   {id}/status   │  Results   │             │
│ Overlay         │             │ GET /fem/jobs/  │            │             │
└─────────────────┘             │   {id}/results  │            └─────────────┘
                                └─────────────────┘
```

### FEM Job Request
```typescript
interface FEMJobRequest {
  userId: string;          // Requires account
  simulationType: 'net_capture' | 'tether_dynamics';
  
  // Geometry (exported from browser state)
  mesh: {
    nodes: [number, number, number][];
    elements: number[][];  // connectivity
  };
  
  // Material properties
  material: {
    youngsModulus: number;  // Pa
    poissonsRatio: number;
    density: number;        // kg/m³
    yieldStrength: number;  // Pa
  };
  
  // Boundary conditions (from rigid body state)
  boundaryConditions: {
    fixedNodes: number[];
    contacts: {
      rigidBodyMesh: string;  // URL or base64
      frictionCoefficient: number;
    }[];
  };
  
  // Solver settings
  solver: {
    type: 'dynamic_explicit' | 'dynamic_implicit';
    duration: number;       // seconds
    outputInterval: number; // seconds between output frames
  };
}
```

### Results Visualization
- Import displacement field → animate deformed net shape
- Color elements by von Mises stress
- Highlight elements exceeding yield strength (failure prediction)
- Compare PBD preview to FEM results

## 3.4 User Accounts and Payment (Phase 3)

### Account Features
```typescript
interface UserAccount {
  id: string;
  email: string;
  tier: 'free' | 'pro';
  
  // Free tier
  // - Browser physics only
  // - Save up to 5 scenarios
  // - No cloud FEM
  
  // Pro tier
  // - Server-side MuJoCo
  // - Unlimited saved scenarios
  // - Cloud FEM access
  // - Pay-as-you-go compute: ~$0.10-0.20/minute
  
  computeCredits: number;  // dollars
  savedScenarios: string[];
}
```

### Payment Integration
- Stripe for payment processing
- Pre-paid credits model (buy $10, $50, $100 blocks)
- Usage tracking and billing dashboard
- Cost estimates before job submission

## 3.5 Chat Commands for Phase 3

```typescript
const PHASE3_COMMANDS = {
  // Net creation
  'create net <width>m x <height>m': 'Create capture net',
  'set net resolution <nodes/m>': 'Adjust mesh density',
  'set net material <name>': 'Apply material (Dyneema, Kevlar, etc.)',
  
  // Simulation
  'deploy net at <velocity> m/s': 'Launch corner masses',
  'simulate net capture': 'Run PBD contact simulation',
  
  // Cloud FEM
  'analyze stress': 'Submit to cloud FEM (requires pro account)',
  'show stress distribution': 'Display FEM results',
  'find failure points': 'Highlight overstressed elements',
  
  // Account
  'show account': 'Display account status and credits',
  'buy credits': 'Open payment dialog',
};
```

## 3.6 Phase 3 Deliverables

- [ ] User authentication (email/password or OAuth)
- [ ] Account management UI
- [ ] Free vs Pro tier enforcement
- [ ] Payment integration (Stripe)
- [ ] Credit purchase flow
- [ ] Server-side MuJoCo backend
- [ ] Server physics toggle (functional for Pro users)
- [ ] PBD net simulation in browser
- [ ] Verlet tether simulation
- [ ] Net deployment animation
- [ ] Simplified net-debris contact
- [ ] Tension visualization on net
- [ ] Cloud FEM job submission API
- [ ] SimScale or OnScale connector
- [ ] Job queue and status tracking
- [ ] FEM results import and display
- [ ] Stress/strain field visualization
- [ ] Failure prediction highlighting
- [ ] Usage tracking and billing

---

# IMPLEMENTATION GUIDANCE

## For Claude Code

1. **Start with file structure**: Ask Claude Code to create the directory structure first
2. **Types before implementation**: Define TypeScript interfaces before components
3. **One component at a time**: Build OrbitalViewer, test it, then DebrisLayer, etc.
4. **Use the spec file**: Save this document in the project, reference it with:
   ```
   > Read docs/SPEC.md and implement the Cesium OrbitalViewer component
   ```

## For Cursor

1. **Create files with comments first**: Write out the component structure with TODO comments
2. **Use @-mentions**: `@SPEC.md` to keep the spec in context
3. **Composer for scaffolding**: Use Cmd+I for multi-file generation
4. **Inline generation**: Write a comment describing what you need, let Cursor complete

## Starting Prompt (Use for Both)

```
I'm building a space debris visualization and capture simulation platform.

Read the SPEC.md file in docs/. Implement Phase 1, starting with:

1. Project setup: React + TypeScript + Vite
2. Install dependencies: cesium, resium, three, @react-three/fiber, satellite.js, zustand
3. Create the basic project structure from the spec
4. Implement the Cesium OrbitalViewer component with Earth visualization

Don't implement everything at once. Start with getting a Cesium globe rendering with basic camera controls.
```

---

# FUTURE EXTENSIONS (Post-Phase 3)

- **Gamification**: Competitive debris removal challenges, leaderboards
- **Multiplayer**: Collaborative mission planning
- **VR/AR**: Immersive visualization mode
- **Conjunction alerts**: Real-time collision warnings from Space-Track CDM
- **ML optimization**: Train policies for optimal capture trajectories
- **Hardware-in-the-loop**: Connect to robotic test hardware
- **GMAT/STK export**: Validate scenarios in industry tools
- **Public API**: Let others build on your simulation platform
