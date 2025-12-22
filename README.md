# Space Debris Visualization & Capture Simulator

A browser-based platform for visualizing space debris and simulating capture systems using CesiumJS for orbital visualization and Three.js + MuJoCo for physics simulation.

## Phase 1 Status ✅

- **Project Setup**: React + TypeScript + Vite ✅
- **Dependencies**: Cesium, Three.js, Zustand installed ✅
- **Project Structure**: Component organization according to spec ✅
- **Cesium Integration**: Earth visualization with basic camera controls ✅
- **View Switching**: Toggle between Orbital and Simulation views ✅

## Quick Start

1. **Get a free Cesium Ion token** (optional but recommended):
   - Visit https://cesium.com/ion/
   - Create a free account
   - Copy your access token

2. **Configure the token**:
   ```bash
   # Edit .env file
   VITE_CESIUM_ION_TOKEN=your_actual_token_here
   ```

3. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```

4. **Open your browser** to http://localhost:5173

## Current Features

### Orbital View (Cesium)
- 3D Earth globe with high-quality imagery
- Space-optimized camera controls
- Dark space background
- View switcher to toggle between Orbital/Simulation modes

### Simulation View (Placeholder)
- Ready for Three.js + MuJoCo implementation
- Placeholder UI shows future physics simulation area

## Project Structure

```
src/
├── components/
│   ├── cesium/           # Cesium orbital visualization
│   │   └── OrbitalViewer.tsx
│   ├── simulation/       # Three.js physics simulation  
│   │   └── SimulationViewer.tsx
│   └── ui/              # Interface components
│       └── ViewSwitcher.tsx
├── stores/              # Zustand state management
│   ├── ui-store.ts
│   └── debris-store.ts
└── types/               # TypeScript definitions
    ├── debris.ts
    └── simulation.ts
```

## Next Steps (Phase 1 Completion)

- [ ] Space-Track API integration for real debris data
- [ ] TLE parsing and orbital propagation with satellite.js
- [ ] Debris visualization as points on the globe
- [ ] Object selection and info panels
- [ ] Orbit path visualization
- [ ] Timeline controls for animation
- [ ] Basic collision simulation setup

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Orbital Visualization**: CesiumJS + ion imagery
- **Physics Simulation**: Three.js + @react-three/fiber + MuJoCo WASM (planned)
- **State Management**: Zustand
- **Orbital Mechanics**: satellite.js for SGP4/SDP4 propagation

## Development

The project follows the [specification document](./space-debris-simulator-spec-v2.md) which details the full three-phase implementation plan.

Current phase focuses on getting basic visualization working before adding complexity.
