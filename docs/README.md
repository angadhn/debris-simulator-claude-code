# Technical Documentation

This directory contains technical documentation for the Space Debris Visualization & Capture Simulation Platform.

## Current Documentation

### Phase 1: Debris Visualization
- **[orbit-propagation.md](orbit-propagation.md)** - Detailed explanation of SGP4 and Kepler 2-body orbital propagation methods
  - How TLEs are converted to Keplerian elements
  - Mathematical formulations and algorithms
  - Performance comparisons and accuracy analysis
  - Educational applications and classroom exercises
  - Links to implementation code

## Planned Documentation (Future Phases)

### Phase 2: Capture System Simulation
*Coming soon - will document:*
- MuJoCo physics integration (WASM and server-side)
- MJCF model generation for robotic grippers and arms
- Contact dynamics and grasp stability analysis
- Proximity operations and approach trajectories
- Detumbling algorithms

### Phase 3: Flexible Bodies and Cloud FEM
*Coming soon - will document:*
- Position-Based Dynamics (PBD) for net simulation
- Browser-side vs. cloud-based finite element methods
- Net deployment mechanics
- Stress/strain analysis workflows
- Material properties and failure prediction

## Documentation Philosophy

This documentation is designed to be:
1. **Implementation-specific** - explains what's actually in the code, not just theory
2. **Educational** - suitable for students learning orbital mechanics and robotics
3. **Linked to source** - every explanation points to the actual implementation
4. **Accurate** - no hand-wavy claims (e.g., we corrected the "~1% error per day" claim)

## Contributing

When adding new features, please:
1. Add corresponding documentation in this directory
2. Link documentation from the UI where users might have questions
3. Include code examples and links to implementation files
4. Add educational context where applicable (this is a learning platform!)

## External Resources

For the overall project specification and architecture, see:
- [Project Specification](../space-debris-simulator-spec-v2.md) - Full 3-phase development plan
- [README](../README.md) - Project setup and getting started
- [DEPLOYMENT](../DEPLOYMENT.md) - Deployment instructions

---

*Part of the Space Debris Visualization Platform - Phases 1-3*
