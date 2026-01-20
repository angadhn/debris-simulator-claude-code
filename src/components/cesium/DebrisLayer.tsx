import { useEffect, useRef, useMemo } from 'react';
import * as Cesium from 'cesium';
import { useDebrisStore } from '../../stores/debris-store';
import { useUIStore } from '../../stores/ui-store';
import { propagateAllDebris, getDebrisColor, generateOrbitPath, propagatePosition } from '../../utils/orbital-propagation';
import { parseTLEOrbitalElements, propagateKeplerPosition } from '../../utils/kepler-propagation';
import * as satellite from 'satellite.js';
import type { TLEData } from '../../services/debris-api';
import type { DebrisPosition } from '../../utils/orbital-propagation';

interface DebrisLayerProps {
  viewer: Cesium.Viewer | null;
}

export function DebrisLayer({ viewer }: DebrisLayerProps) {
  const debris = useDebrisStore((state) => state.debris);
  const filters = useDebrisStore((state) => state.filters);
  const orbitFilters = useDebrisStore((state) => state.orbitFilters);
  const countryFilters = useDebrisStore((state) => state.countryFilters);
  const searchQuery = useDebrisStore((state) => state.searchQuery);
  const selectedDebrisId = useDebrisStore((state) => state.selectedDebrisId);
  const isAnimating = useDebrisStore((state) => state.isAnimating);
  const animationSpeed = useDebrisStore((state) => state.animationSpeed);
  const setSelectedDebrisId = useDebrisStore((state) => state.setSelectedDebrisId);
  const propagationMode = useUIStore((state) => state.propagationMode);
  const cameraMode = useUIStore((state) => state.cameraMode);

  const pointCollectionRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const orbitPathRef = useRef<Cesium.Entity | null>(null);
  const debrisPositionsRef = useRef<DebrisPosition[]>([]);
  const keplerElementsRef = useRef<Map<string, ReturnType<typeof parseTLEOrbitalElements>>>(new Map());
  const animatedEntityRef = useRef<Cesium.Entity | null>(null);
  const trailEntityRef = useRef<Cesium.Entity | null>(null);
  const trailPositionsRef = useRef<Cesium.Cartesian3[]>([]);
  const preRenderListenerRef = useRef<(() => void) | null>(null);
  const firstPersonInitializedRef = useRef<boolean>(false);

  // Filter debris based on all filters
  const filteredDebris = useMemo(() => {
    return debris.filter((d) => {
      // Determine object type
      const type = d.objectType.toUpperCase();
      let filterType: 'payload' | 'rocketBody' | 'debris' | 'unknown';

      if (type.includes('PAYLOAD')) {
        filterType = 'payload';
      } else if (type.includes('ROCKET') || type.includes('R/B')) {
        filterType = 'rocketBody';
      } else if (type.includes('DEBRIS')) {
        filterType = 'debris';
      } else {
        filterType = 'unknown';
      }

      // Check if this type is enabled
      if (!filters[filterType].enabled) return false;

      // Check size filter for this type
      const rcsSize = d.rcsSize?.toUpperCase();
      const typeFilters = filters[filterType].sizes;

      if (rcsSize) {
        // Has RCS size - check specific size filter
        if (rcsSize === 'SMALL' && !typeFilters.small) return false;
        if (rcsSize === 'MEDIUM' && !typeFilters.medium) return false;
        if (rcsSize === 'LARGE' && !typeFilters.large) return false;
      } else {
        // No RCS size - check unknown size filter
        if (!typeFilters.unknown) return false;
      }

      // Orbit range filter (using apogee in km)
      const apogee = d.apogee || 0;
      const inclination = d.inclination || 0;

      // LEO filter with sub-filters
      if (apogee < 2000) {
        if (!orbitFilters.leo) return false;
        // Apply inclination sub-filters only when expanded
        if (orbitFilters.leoExpanded) {
          const isSSO = inclination >= 96 && inclination <= 99;
          const isPolar = inclination >= 80 && inclination < 96; // Polar excluding SSO
          const isISS = inclination >= 50 && inclination <= 53;
          const isEquatorial = inclination >= 0 && inclination <= 15;
          const isOther = !isSSO && !isPolar && !isISS && !isEquatorial;

          if (isSSO && !orbitFilters.leoSub.sso) return false;
          if (isPolar && !orbitFilters.leoSub.polar) return false;
          if (isISS && !orbitFilters.leoSub.iss) return false;
          if (isEquatorial && !orbitFilters.leoSub.equatorial) return false;
          if (isOther && !orbitFilters.leoSub.other) return false;
        }
      }

      // MEO and GEO filters
      if (apogee >= 2000 && apogee < 35000 && !orbitFilters.meo) return false;
      if (apogee >= 35000 && !orbitFilters.geo) return false;

      // Search filter (name or NORAD ID)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(query);
        const matchesNorad = d.noradId.toString().includes(query);
        if (!matchesName && !matchesNorad) return false;
      }

      // Country filter (empty array = show all)
      if (countryFilters.length > 0) {
        const countryCode = d.countryCode || 'UNKNOWN';
        if (!countryFilters.includes(countryCode)) return false;
      }

      return true;
    });
  }, [debris, filters, orbitFilters, countryFilters, searchQuery]);

  // Render debris points - ONLY when viewer, filteredDebris, or propagationMode changes
  useEffect(() => {
    if (!viewer) return;

    console.log(`Rendering ${filteredDebris.length} debris objects using ${propagationMode.toUpperCase()} propagation`);

    // Remove existing points
    if (pointCollectionRef.current) {
      viewer.scene.primitives.remove(pointCollectionRef.current);
      pointCollectionRef.current = null;
    }

    if (filteredDebris.length === 0) {
      return;
    }

    // Create point primitive collection
    const pointCollection = new Cesium.PointPrimitiveCollection();

    const currentTime = Cesium.JulianDate.toDate(viewer.clock.currentTime);

    if (propagationMode === 'kepler') {
      // Use Kepler propagation (fast mode)
      console.time('Kepler propagation');
      console.log(`[KEPLER] Rendering at time: ${currentTime.toISOString()}`);

      // Clear previous Kepler elements
      keplerElementsRef.current.clear();

      const positions: DebrisPosition[] = [];
      let comparisonCount = 0;

      filteredDebris.forEach((d) => {
        try {
          // Parse orbital elements from TLE, using CURRENT TIME as reference
          // This ensures Kepler matches SGP4 position at the moment of switching modes
          const orbitalElements = parseTLEOrbitalElements(d.tle.line1, d.tle.line2, currentTime);

          // Store for later animation
          keplerElementsRef.current.set(d.noradId.toString(), orbitalElements);

          // Propagate position (should be nearly identical to SGP4 at currentTime)
          const [x, y, z] = propagateKeplerPosition(orbitalElements, currentTime);
          const position = new Cesium.Cartesian3(x, y, z);

          // DEBUG: Compare with SGP4 for first 5 objects (both in ECEF)
          if (comparisonCount < 5) {
            const satrec = satellite.twoline2satrec(d.tle.line1, d.tle.line2);
            const sgp4Result = satellite.propagate(satrec, currentTime);
            if (sgp4Result && sgp4Result.position && typeof sgp4Result.position !== 'boolean') {
              // Convert SGP4 ECI to ECEF for fair comparison
              const sgp4Eci = sgp4Result.position;
              const gmst = satellite.gstime(currentTime);
              const cosGmst = Math.cos(gmst);
              const sinGmst = Math.sin(gmst);
              const sgp4Ecef = {
                x: cosGmst * sgp4Eci.x + sinGmst * sgp4Eci.y,
                y: -sinGmst * sgp4Eci.x + cosGmst * sgp4Eci.y,
                z: sgp4Eci.z
              };

              const keplerPos = { x: x/1000, y: y/1000, z: z/1000 }; // Convert to km (already ECEF)
              const diff = Math.sqrt(
                Math.pow(sgp4Ecef.x - keplerPos.x, 2) +
                Math.pow(sgp4Ecef.y - keplerPos.y, 2) +
                Math.pow(sgp4Ecef.z - keplerPos.z, 2)
              );
              console.log(`[DEBUG ${d.name}] SGP4 vs Kepler at currentTime (ECEF):`);
              console.log(`  SGP4:   [${sgp4Ecef.x.toFixed(2)}, ${sgp4Ecef.y.toFixed(2)}, ${sgp4Ecef.z.toFixed(2)}] km`);
              console.log(`  Kepler: [${keplerPos.x.toFixed(2)}, ${keplerPos.y.toFixed(2)}, ${keplerPos.z.toFixed(2)}] km`);
              console.log(`  Difference: ${diff.toFixed(2)} km`);
            }
            comparisonCount++;
          }

          // Add point
          pointCollection.add({
            position,
            color: getDebrisColor(d.objectType),
            pixelSize: 4,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
            id: d.noradId.toString(),
          });

          // Store position - also store satrec for orbit path generation
          const satrec = satellite.twoline2satrec(d.tle.line1, d.tle.line2);
          positions.push({
            noradId: d.noradId.toString(),
            name: d.name,
            objectType: d.objectType,
            position,
            satrec, // Store satrec for orbit path generation (even in Kepler mode)
          });
        } catch (error) {
          console.error(`Failed to propagate debris ${d.noradId} with Kepler:`, error);
        }
      });

      debrisPositionsRef.current = positions;
      console.timeEnd('Kepler propagation');
      console.log(`Kepler: Added ${positions.length} debris points to scene (initialized at current time - should match SGP4)`);

    } else {
      // Use SGP4 propagation (accurate mode)
      console.time('SGP4 propagation');
      console.log(`[SGP4] Rendering at time: ${currentTime.toISOString()}`);

      // Convert to TLEData format
      const tleDataList: TLEData[] = filteredDebris.map((d) => ({
        NORAD_CAT_ID: d.noradId.toString(),
        OBJECT_NAME: d.name,
        OBJECT_TYPE: d.objectType,
        TLE_LINE0: `0 ${d.name}`,
        TLE_LINE1: d.tle.line1,
        TLE_LINE2: d.tle.line2,
        EPOCH: '',
        INCLINATION: d.inclination?.toString() || '0',
        ECCENTRICITY: '0',
        MEAN_MOTION: '0',
        SEMIMAJOR_AXIS: '0',
        PERIOD: (d.orbitPeriod ? d.orbitPeriod / 60 : 0).toString(),
        APOAPSIS: d.apogee?.toString() || '0',
        PERIAPSIS: d.perigee?.toString() || '0',
        COUNTRY_CODE: '',
        LAUNCH_DATE: '',
        RCS_SIZE: '',
      }));

      // Propagate positions
      const positions = propagateAllDebris(tleDataList, currentTime);
      debrisPositionsRef.current = positions;

      // DEBUG: Log first few positions for comparison with Kepler
      if (positions.length > 0 && positions.length <= 5) {
        positions.forEach((pos) => {
          const posKm = {
            x: pos.position.x / 1000,
            y: pos.position.y / 1000,
            z: pos.position.z / 1000
          };
          console.log(`[SGP4 DEBUG ${pos.name}] Position: [${posKm.x.toFixed(2)}, ${posKm.y.toFixed(2)}, ${posKm.z.toFixed(2)}] km at ${currentTime.toISOString()}`);
        });
      }

      // Add points
      positions.forEach((pos) => {
        pointCollection.add({
          position: pos.position,
          color: getDebrisColor(pos.objectType),
          pixelSize: 4,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
          id: pos.noradId,
        });
      });

      console.timeEnd('SGP4 propagation');
      console.log(`SGP4: Added ${positions.length} debris points to scene`);
    }

    viewer.scene.primitives.add(pointCollection);
    pointCollectionRef.current = pointCollection;

    return () => {
      if (pointCollectionRef.current && viewer) {
        viewer.scene.primitives.remove(pointCollectionRef.current);
        pointCollectionRef.current = null;
      }
    };
  }, [viewer, filteredDebris, propagationMode]);

  // Handle clicks
  useEffect(() => {
    if (!viewer) return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const pickedObject = viewer.scene.pick(click.position);

      if (Cesium.defined(pickedObject) && pickedObject.id) {
        const pickedIdStr = String(pickedObject.id);
        const noradId = parseInt(pickedIdStr);
        setSelectedDebrisId(noradId);
        console.log(`Clicked debris: NORAD ${noradId}`);

        // Find selected debris position
        const selectedPos = debrisPositionsRef.current.find(
          (p) => p.noradId === pickedIdStr
        );

        if (!selectedPos) {
          console.warn(`Could not find debris position for NORAD ${noradId}`);
          return;
        }

        console.log(`Drawing orbit for ${selectedPos.name}`);

        // Remove existing orbit path
        if (orbitPathRef.current) {
          viewer.entities.remove(orbitPathRef.current);
          orbitPathRef.current = null;
        }

        // Generate 24-hour orbit path
        const currentTime = Cesium.JulianDate.toDate(viewer.clock.currentTime);
        const duration = 86400; // 24 hours in seconds
        const samplingInterval = 60; // Sample every 60 seconds for smooth path

        // Generate SGP4 orbit path (GREEN DASHED)
        const sgp4OrbitPositions = generateOrbitPath(selectedPos.satrec, currentTime, duration, samplingInterval);

        if (sgp4OrbitPositions.length >= 2) {
          const orbitEntity = viewer.entities.add({
            name: `Orbit path for ${selectedPos.name}`,
            polyline: {
              positions: sgp4OrbitPositions,
              width: 2,
              material: new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.LIME.withAlpha(0.8),
                dashLength: 16,
              }),
              clampToGround: false,
            },
          });
          orbitPathRef.current = orbitEntity;
          console.log(`Orbit path: ${sgp4OrbitPositions.length} positions for 24-hour period`);
        }

      } else {
        // Clicked empty space - clear selection
        setSelectedDebrisId(null);
        if (orbitPathRef.current && viewer) {
          viewer.entities.remove(orbitPathRef.current);
          orbitPathRef.current = null;
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
    };
  }, [viewer]);

  // Cleanup orbit path
  useEffect(() => {
    return () => {
      if (orbitPathRef.current && viewer) {
        viewer.entities.remove(orbitPathRef.current);
        orbitPathRef.current = null;
      }
    };
  }, [viewer]);

  // Camera focus on selected debris
  useEffect(() => {
    if (!viewer || !selectedDebrisId) return;

    // Find selected debris position
    const selectedPos = debrisPositionsRef.current.find(
      (p) => parseInt(p.noradId) === selectedDebrisId
    );

    if (!selectedPos) {
      console.warn(`Could not find debris position for camera focus: ${selectedDebrisId}`);
      return;
    }

    console.log(`Focusing camera on ${selectedPos.name} (NORAD ${selectedDebrisId})`);

    // Pan camera to debris object while maintaining home screen zoom level
    // Position camera at fixed distance from Earth center (not debris)
    const debrisDirection = Cesium.Cartesian3.normalize(
      selectedPos.position,
      new Cesium.Cartesian3()
    );

    // Position camera at ~3.5x Earth radius from center (comfortable Earth view)
    // This maintains the "home screen" zoom level
    const earthRadius = 6371000; // meters
    const cameraDistance = earthRadius * 3.5; // ~22,300 km from Earth center
    const cameraPosition = Cesium.Cartesian3.multiplyByScalar(
      debrisDirection,
      cameraDistance,
      new Cesium.Cartesian3()
    );

    viewer.camera.flyTo({
      destination: cameraPosition,
      orientation: {
        direction: Cesium.Cartesian3.negate(debrisDirection, new Cesium.Cartesian3()),
        up: Cesium.Cartesian3.cross(
          Cesium.Cartesian3.UNIT_Z,
          debrisDirection,
          new Cesium.Cartesian3()
        ),
      },
      duration: 2.0,
    });
  }, [viewer, selectedDebrisId]);

  // Animation system
  useEffect(() => {
    if (!viewer || !isAnimating || !selectedDebrisId) {
      // Stop animation
      if (preRenderListenerRef.current) {
        viewer?.scene.preRender.removeEventListener(preRenderListenerRef.current);
        preRenderListenerRef.current = null;
      }
      if (animatedEntityRef.current && viewer) {
        viewer.entities.remove(animatedEntityRef.current);
        animatedEntityRef.current = null;
      }
      // Remove trail
      if (trailEntityRef.current && viewer) {
        viewer.entities.remove(trailEntityRef.current);
        trailEntityRef.current = null;
      }
      trailPositionsRef.current = [];
      firstPersonInitializedRef.current = false; // Reset for next first-person view

      // Restore point collection opacity and visibility
      if (pointCollectionRef.current) {
        for (let i = 0; i < pointCollectionRef.current.length; i++) {
          const point = pointCollectionRef.current.get(i);
          point.show = true; // Make sure all points are visible
          const pointIdStr = String(point.id);
          const debris = debrisPositionsRef.current.find(p => p.noradId === pointIdStr);
          point.color = debris ? getDebrisColor(debris.objectType) : Cesium.Color.WHITE;
        }
      }
      return;
    }

    console.log(`Starting animation for debris ${selectedDebrisId}`);

    // Find selected debris
    const selectedPos = debrisPositionsRef.current.find(
      (p) => parseInt(p.noradId) === selectedDebrisId
    );

    if (!selectedPos) {
      console.warn(`Could not find debris for animation: ${selectedDebrisId}`);
      return;
    }

    // Set Cesium clock multiplier
    viewer.clock.multiplier = animationSpeed;
    viewer.clock.shouldAnimate = true;

    // Dim non-selected debris
    if (pointCollectionRef.current) {
      for (let i = 0; i < pointCollectionRef.current.length; i++) {
        const point = pointCollectionRef.current.get(i);
        const pointIdStr = String(point.id);
        const selectedIdStr = String(selectedDebrisId);

        if (pointIdStr === selectedIdStr) {
          point.show = false; // Hide the static point for selected debris
        } else {
          // Dim other points
          const debris = debrisPositionsRef.current.find(p => p.noradId === pointIdStr);
          if (debris) {
            const originalColor = getDebrisColor(debris.objectType);
            point.color = originalColor.withAlpha(0.2);
          }
        }
      }
    }

    // Create animated entity for selected debris
    const animatedEntity = viewer.entities.add({
      name: `Animated ${selectedPos.name}`,
      position: selectedPos.position,
      point: {
        pixelSize: 8,
        color: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
      },
    });

    animatedEntityRef.current = animatedEntity;

    // Create trail entity
    trailPositionsRef.current = [];
    const trailEntity = viewer.entities.add({
      name: `Trail for ${selectedPos.name}`,
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          return trailPositionsRef.current;
        }, false),
        width: 3,
        material: Cesium.Color.RED.withAlpha(0.8),
        clampToGround: false,
      },
    });

    trailEntityRef.current = trailEntity;

    // Set up animation loop
    const preRenderListener = () => {
      if (!viewer || !animatedEntity || !selectedPos) return;

      // Get current simulation time
      const currentTime = Cesium.JulianDate.toDate(viewer.clock.currentTime);

      let currentPosition: Cesium.Cartesian3 | null = null;

      if (propagationMode === 'kepler') {
        // Use Kepler propagation for animation
        const keplerElements = keplerElementsRef.current.get(selectedDebrisId.toString());
        if (keplerElements) {
          const [x, y, z] = propagateKeplerPosition(keplerElements, currentTime);
          const position = new Cesium.Cartesian3(x, y, z);
          animatedEntity.position = new Cesium.ConstantPositionProperty(position);
          currentPosition = position;
        }
      } else {
        // Use SGP4 propagation for animation
        const result = propagatePosition(selectedPos.satrec, currentTime);
        if (result) {
          animatedEntity.position = new Cesium.ConstantPositionProperty(result.position);
          currentPosition = result.position;
        }
      }

      // Update trail - add current position
      if (currentPosition) {
        trailPositionsRef.current.push(currentPosition.clone());
        // No limit - allow full orbital track to be visible
      }

      // Update camera for first-person view
      if (cameraMode === 'firstPerson' && currentPosition) {
        if (!firstPersonInitializedRef.current) {
          // First time: Set initial orientation
          const cameraPosition = currentPosition.clone();

          // Calculate forward direction (tangent to orbit)
          const positionNormalized = Cesium.Cartesian3.normalize(cameraPosition, new Cesium.Cartesian3());
          const east = Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_Z, positionNormalized, new Cesium.Cartesian3());
          Cesium.Cartesian3.normalize(east, east);
          const forward = Cesium.Cartesian3.cross(positionNormalized, east, new Cesium.Cartesian3());
          Cesium.Cartesian3.normalize(forward, forward);

          // Calculate downward direction (toward Earth)
          const earthCenter = Cesium.Cartesian3.ZERO;
          const down = Cesium.Cartesian3.subtract(earthCenter, cameraPosition, new Cesium.Cartesian3());
          Cesium.Cartesian3.normalize(down, down);

          // Blend forward (60%) and down (40%) for nice horizon view
          const direction = new Cesium.Cartesian3();
          Cesium.Cartesian3.multiplyByScalar(forward, 0.6, direction);
          const downScaled = new Cesium.Cartesian3();
          Cesium.Cartesian3.multiplyByScalar(down, 0.4, downScaled);
          Cesium.Cartesian3.add(direction, downScaled, direction);
          Cesium.Cartesian3.normalize(direction, direction);

          // Up vector: perpendicular to direction, roughly away from Earth
          const up = Cesium.Cartesian3.cross(direction, east, new Cesium.Cartesian3());
          Cesium.Cartesian3.normalize(up, up);

          // Set initial camera position and orientation
          viewer.camera.setView({
            destination: cameraPosition,
            orientation: {
              direction: direction,
              up: up,
            },
          });

          firstPersonInitializedRef.current = true;
        } else {
          // After initialization: Only update position, preserve user's orientation
          viewer.camera.position = currentPosition.clone();
        }
      }
    };

    viewer.scene.preRender.addEventListener(preRenderListener);
    preRenderListenerRef.current = preRenderListener;

    console.log(`Animation started, clock multiplier: ${animationSpeed}x`);

    // Cleanup
    return () => {
      if (preRenderListenerRef.current && viewer) {
        viewer.scene.preRender.removeEventListener(preRenderListenerRef.current);
        preRenderListenerRef.current = null;
      }
      if (animatedEntityRef.current && viewer) {
        viewer.entities.remove(animatedEntityRef.current);
        animatedEntityRef.current = null;
      }
      if (trailEntityRef.current && viewer) {
        viewer.entities.remove(trailEntityRef.current);
        trailEntityRef.current = null;
      }
      trailPositionsRef.current = [];
    };
  }, [viewer, isAnimating, selectedDebrisId, animationSpeed, propagationMode, cameraMode]);

  // Handle first-person camera mode (even when not animating)
  useEffect(() => {
    if (!viewer || !selectedDebrisId || cameraMode !== 'firstPerson') {
      return;
    }

    // Find selected debris position
    const selectedPos = debrisPositionsRef.current.find(
      (p) => p.noradId === selectedDebrisId.toString()
    );

    if (!selectedPos) {
      return;
    }

    // Position camera at satellite location
    const cameraPosition = selectedPos.position.clone();

    // Calculate forward direction (tangent to orbit)
    const positionNormalized = Cesium.Cartesian3.normalize(cameraPosition, new Cesium.Cartesian3());
    const east = Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_Z, positionNormalized, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(east, east);
    const forward = Cesium.Cartesian3.cross(positionNormalized, east, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(forward, forward);

    // Calculate downward direction (toward Earth)
    const earthCenter = Cesium.Cartesian3.ZERO;
    const down = Cesium.Cartesian3.subtract(earthCenter, cameraPosition, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(down, down);

    // Blend forward (60%) and down (40%) for nice horizon view
    const direction = new Cesium.Cartesian3();
    Cesium.Cartesian3.multiplyByScalar(forward, 0.6, direction);
    const downScaled = new Cesium.Cartesian3();
    Cesium.Cartesian3.multiplyByScalar(down, 0.4, downScaled);
    Cesium.Cartesian3.add(direction, downScaled, direction);
    Cesium.Cartesian3.normalize(direction, direction);

    // Up vector: perpendicular to direction, roughly away from Earth
    const up = Cesium.Cartesian3.cross(direction, east, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(up, up);

    // Fly to first-person view
    viewer.camera.flyTo({
      destination: cameraPosition,
      orientation: {
        direction: direction,
        up: up,
      },
      duration: 1.5,
    });
  }, [viewer, selectedDebrisId, cameraMode]);

  return null;
}
