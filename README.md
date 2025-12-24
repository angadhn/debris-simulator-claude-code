# Space Debris Visualization Platform

A browser-based platform for visualizing 25,000+ tracked orbital objects in real-time using CesiumJS. Features dual propagation modes (SGP4 and Kepler), interactive orbit visualization, and educational tools for understanding orbital mechanics.

## Live Features

### Orbital Visualization
- **25,000+ tracked objects** from Space-Track catalog (satellites, rocket bodies, debris)
- **Real-time propagation** using SGP4 (accurate) or Kepler 2-body (fast) modes
- **24-hour orbit paths** displayed as green dashed lines when selecting objects
- **Color-coded objects** by type (payload, rocket body, debris)

### Interactive Controls
- **Click any object** to view its orbital path and information
- **Play/pause animation** with adjustable speed (1x to 1000x)
- **First-person camera mode** - ride along with a satellite
- **Search** by name or NORAD ID

### Filtering
- **Object type filters** (payloads, rocket bodies, debris)
- **Size filters** (small, medium, large based on RCS)
- **Orbit regime filters** (LEO, MEO, GEO)
- **Country filters** (filter by launching country)

### Propagation Modes
- **SGP4**: Industry-standard propagation including J2 perturbations, drag, and third-body effects
- **Kepler**: Fast 2-body propagation for performance-critical visualization

See [docs/orbit-propagation.md](docs/orbit-propagation.md) for technical details on the propagation methods.

### Mobile Support
- Responsive UI with collapsible filter panel
- Touch-friendly controls
- Welcome tutorial for new users

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Cesium token** (optional but recommended):
   ```bash
   # Edit .env file
   VITE_CESIUM_ION_TOKEN=your_token_here
   ```
   Get a free token at https://cesium.com/ion/

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open** http://localhost:5173

## Project Structure

```
src/
├── components/
│   ├── cesium/              # Cesium orbital visualization
│   │   ├── OrbitalViewer.tsx
│   │   └── DebrisLayer.tsx  # Main debris rendering & propagation
│   ├── ui/                  # Interface components
│   │   ├── DebrisSearchPanel.tsx
│   │   ├── MobileToolbar.tsx
│   │   └── WelcomeTutorial.tsx
│   └── simulation/          # Three.js physics (placeholder)
├── services/
│   └── debris-api.ts        # Space-Track data fetching
├── stores/                  # Zustand state management
│   ├── ui-store.ts
│   └── debris-store.ts
├── utils/
│   ├── orbital-propagation.ts   # SGP4 propagation utilities
│   └── kepler-propagation.ts    # Kepler 2-body propagation
└── types/
    └── debris.ts
```

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Orbital Visualization**: CesiumJS
- **State Management**: Zustand
- **Orbital Mechanics**: satellite.js (SGP4/SDP4), custom Kepler implementation
- **Data Source**: Space-Track TLE catalog

## Documentation

- [Orbital Propagation Methods](docs/orbit-propagation.md) - Technical details on SGP4 vs Kepler propagation
- [Project Specification](space-debris-simulator-spec-v2.md) - Full three-phase implementation plan

## Future Plans

- Phase 2: Capture system simulation with Three.js + MuJoCo
- Phase 3: Flexible body dynamics for nets and tethers

## Development

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run preview  # Preview production build
```
