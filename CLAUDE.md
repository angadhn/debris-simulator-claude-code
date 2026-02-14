# CLAUDE.md — Space Debris Visualization & Capture Simulation Platform

## Project Identity

- **Title:** Space Debris Visualization & Capture Simulation Platform
- **Repository:** `angadhn/debris-simulator-claude-code`
- **Author:** angadhn (Angadh Nanjangud)
- **Venue/Template:** None — this is a web application, not an academic paper
- **License:** Not specified
- **Domain:** Orbital mechanics, space debris tracking, astrodynamics visualization

## Build & Run

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run dev:server   # Start Space-Track proxy server
npm run dev:all      # Start both
npm run build        # Production build (tsc + vite)
npm run preview      # Preview production build
```

Requires `.env` with:
- `VITE_CESIUM_ION_TOKEN` — CesiumJS access token (optional but recommended)
- Space-Track credentials for the proxy server

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript + Vite |
| 3D Globe | CesiumJS (via resium) |
| 3D Physics (planned) | Three.js + @react-three/fiber |
| Physics Engine (planned) | MuJoCo WASM |
| State Management | Zustand |
| Orbital Propagation | satellite.js (SGP4/SDP4) + custom Kepler 2-body |
| Data Source | Space-Track.org TLE catalog |
| Backend | Express server (dev) / Vercel serverless (prod) |
| HTTP Client | Axios |

## Structure Map

```
Root
├── src/                        # Frontend application
│   ├── App.tsx                 # ✅ STABLE — Main layout, view switching
│   ├── main.tsx                # ✅ STABLE — Entry point
│   ├── components/
│   │   ├── cesium/
│   │   │   ├── OrbitalViewer.tsx    # ✅ STABLE — Cesium globe + debris rendering
│   │   │   ├── DebrisLayer.tsx      # ✅ CORE (746 lines) — SGP4/Kepler propagation, rendering
│   │   │   └── FallbackViewer.tsx   # ✅ STABLE — Fallback when Cesium fails
│   │   ├── ui/
│   │   │   ├── FilterPanel.tsx      # ✅ STABLE (582 lines) — Type/orbit/country filters
│   │   │   ├── DebrisSearchPanel.tsx # ✅ STABLE — Search + propagation mode toggle
│   │   │   ├── DebrisLegend.tsx     # ✅ STABLE — Color legend
│   │   │   ├── DebrisInfoPanel.tsx  # ✅ STABLE — Selected object info
│   │   │   ├── TimeControls.tsx     # ✅ STABLE — Play/pause/speed
│   │   │   ├── SearchResultsList.tsx # ✅ STABLE — Search results
│   │   │   ├── CollapsibleSearchButton.tsx # ✅ STABLE — Mobile search
│   │   │   ├── FilterButton.tsx     # ✅ STABLE — Mobile filter trigger
│   │   │   ├── HamburgerMenu.tsx    # ✅ STABLE — Mobile menu
│   │   │   ├── ViewSwitcher.tsx     # ✅ STABLE — Orbital/Simulation toggle
│   │   │   └── WelcomeTutorial.tsx  # ✅ STABLE — First-visit tutorial
│   │   └── simulation/
│   │       └── SimulationViewer.tsx # 🔲 PLACEHOLDER (12 lines) — Three.js scene (Phase 2)
│   ├── services/
│   │   └── debris-api.ts           # ✅ STABLE — Space-Track API client
│   ├── stores/
│   │   ├── debris-store.ts         # ✅ STABLE — Debris catalog + filter state
│   │   └── ui-store.ts             # ✅ STABLE — View mode, UI state
│   ├── hooks/
│   │   ├── useDebrisData.ts        # ✅ STABLE — Data fetching hook
│   │   └── useObjectCounts.ts      # ✅ STABLE — Filtered object counts
│   ├── utils/
│   │   ├── orbital-propagation.ts  # ✅ STABLE — SGP4 wrapper (ECI→ECEF conversion)
│   │   ├── kepler-propagation.ts   # ✅ STABLE — Kepler 2-body (RV2COE algorithm)
│   │   └── tle-converter.ts        # ✅ STABLE — TLE parsing utilities
│   ├── types/
│   │   ├── debris.ts               # ✅ STABLE — DebrisObject, OrbitData types
│   │   └── simulation.ts           # 🔲 PLACEHOLDER — Simulation types (Phase 2)
│   ├── App.css                     # Styling
│   ├── mobile.css                  # Mobile-responsive styles
│   └── index.css                   # Global styles
├── server/                         # Development proxy server
│   ├── server.mjs                  # Express server entry
│   ├── space-track-client.mjs      # Space-Track auth client
│   └── routes/tle.ts               # TLE endpoint routes
├── api/                            # Vercel serverless functions (production)
│   ├── tle/[catalog].ts            # TLE data endpoint
│   ├── search.ts                   # Search endpoint
│   ├── count/[catalog].ts          # Object count endpoint
│   ├── health.ts                   # Health check
│   └── lib/space-track-client.ts   # Shared Space-Track client
├── docs/
│   ├── orbit-propagation.md        # ✅ Detailed propagation documentation
│   └── README.md
├── space-debris-simulator-spec-v2.md  # Full 3-phase specification (1003 lines)
├── DEPLOYMENT.md                   # Vercel deployment guide
├── vercel.json                     # Vercel config
└── .github/workflows/              # CI/CD
    ├── cloude-code.yml
    └── agent-loop-task.yml
```

## Domain Context & Key Terms

- **TLE (Two-Line Element):** Standard format for describing satellite/debris orbits, published by Space-Track/NORAD
- **SGP4:** Simplified General Perturbations 4 — NORAD's standard orbit propagation model accounting for J2, drag, third-body effects
- **Kepler 2-body:** Simplified propagation treating only point-mass gravity (no perturbations)
- **RV2COE:** Position-Velocity to Classical Orbital Elements conversion (Vallado Algorithm 9)
- **ECI:** Earth-Centered Inertial frame (non-rotating)
- **ECEF:** Earth-Centered Earth-Fixed frame (rotates with Earth) — Cesium's native frame
- **GMST:** Greenwich Mean Sidereal Time — rotation angle between ECI and ECEF
- **NORAD ID:** Unique catalog number for tracked space objects
- **RCS:** Radar Cross Section — proxy for object size (SMALL/MEDIUM/LARGE)
- **LEO/MEO/GEO:** Low/Medium/Geostationary Earth Orbit regimes
- **SSO:** Sun-Synchronous Orbit (96-99° inclination)
- **MuJoCo:** Multi-Joint dynamics with Contact — physics engine for Phase 2+

## Project Status

### Phase 1 (Debris Visualization) — ~85% Complete
**Working features:**
- CesiumJS globe with 25,000+ tracked objects from Space-Track
- Dual propagation: SGP4 (accurate) and Kepler 2-body (fast)
- Object selection with orbit path visualization (24h green dashed line)
- Filtering by type, size (RCS), orbit regime, LEO sub-categories, country
- Search by name or NORAD ID
- Time controls with adjustable speed (1x–1000x)
- First-person satellite camera mode
- Mobile-responsive UI with collapsible panels
- Welcome tutorial for first-time visitors

**Not yet implemented (Phase 1):**
- Three.js collision demo scene (SimulationViewer is placeholder)
- MuJoCo WASM collision physics
- Chat/command interface
- Conjunction analysis

### Phase 2 (Capture Systems) — Not Started
- Robotic gripper simulation (MuJoCo WASM)
- Net/tether capture systems
- Proximity operations
- Browser vs. server physics toggle

### Phase 3 (Flexible Bodies) — Not Started
- Flexible body FEM for nets/tethers
- Hybrid browser + cloud architecture

## Known Issues & TODOs
- `SimulationViewer.tsx` is a 12-line placeholder — Phase 2 blocked on MuJoCo integration
- No test suite exists
- TLE data depends on Space-Track credentials for the proxy server
- Some components in spec (ChatInterface, GripperBuilder, NetBuilder, etc.) not yet created

## Key References
- Vallado, D.A. (2013). *Fundamentals of Astrodynamics and Applications* (4th ed.) — RV2COE algorithm
- satellite.js — SGP4/SDP4 implementation
- ASTRIA Graph (UT Austin) — inspiration for Kepler performance approach
- Spacetrack Report #3 — SGP4 documentation

## Workflow Pattern

**Pattern:** N/A (code repository, not academic paper)

This is a software project, not a research paper. The "research" framing from the orchestrator system should be interpreted as: **understanding what this codebase does, its domain, its architecture, and its development trajectory**. There are no LaTeX files, no bibliography, no paper sections.

The appropriate response to "what's happening here?" is a codebase analysis, not a literature review.
