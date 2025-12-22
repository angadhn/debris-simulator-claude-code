import { useEffect, useRef, useMemo } from 'react';
import * as Cesium from 'cesium';
import { useDebrisStore } from '../../stores/debris-store';
import { propagateAllDebris, getDebrisColor, generateOrbitPath, propagatePosition } from '../../utils/orbital-propagation';
import type { TLEData } from '../../services/debris-api';
import type { DebrisPosition } from '../../utils/orbital-propagation';

interface DebrisLayerProps {
  viewer: Cesium.Viewer | null;
}

export function DebrisLayer({ viewer }: DebrisLayerProps) {
  const debris = useDebrisStore((state) => state.debris);
  const filters = useDebrisStore((state) => state.filters);
  const orbitFilters = useDebrisStore((state) => state.orbitFilters);
  const searchQuery = useDebrisStore((state) => state.searchQuery);
  const selectedDebrisId = useDebrisStore((state) => state.selectedDebrisId);
  const isAnimating = useDebrisStore((state) => state.isAnimating);
  const animationSpeed = useDebrisStore((state) => state.animationSpeed);
  const setSelectedDebrisId = useDebrisStore((state) => state.setSelectedDebrisId);

  const pointCollectionRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const orbitPathRef = useRef<Cesium.Entity | null>(null);
  const debrisPositionsRef = useRef<DebrisPosition[]>([]);
  const animatedEntityRef = useRef<Cesium.Entity | null>(null);
  const preRenderListenerRef = useRef<(() => void) | null>(null);

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
      if (apogee < 2000 && !orbitFilters.leo) return false;
      if (apogee >= 2000 && apogee < 35000 && !orbitFilters.meo) return false;
      if (apogee >= 35000 && !orbitFilters.geo) return false;

      // Search filter (name or NORAD ID)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(query);
        const matchesNorad = d.noradId.toString().includes(query);
        if (!matchesName && !matchesNorad) return false;
      }

      return true;
    });
  }, [debris, filters, orbitFilters, searchQuery]);

  // Render debris points - ONLY when viewer or filteredDebris changes
  useEffect(() => {
    if (!viewer) return;

    console.log(`Rendering ${filteredDebris.length} debris objects`);

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
    const currentTime = Cesium.JulianDate.toDate(viewer.clock.currentTime);
    const positions = propagateAllDebris(tleDataList, currentTime);
    debrisPositionsRef.current = positions;

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

    viewer.scene.primitives.add(pointCollection);
    pointCollectionRef.current = pointCollection;

    console.log(`Added ${positions.length} debris points to scene`);

    return () => {
      if (pointCollectionRef.current && viewer) {
        viewer.scene.primitives.remove(pointCollectionRef.current);
        pointCollectionRef.current = null;
      }
    };
  }, [viewer, filteredDebris]);

  // Handle clicks
  useEffect(() => {
    if (!viewer) return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const pickedObject = viewer.scene.pick(click.position);

      if (Cesium.defined(pickedObject) && pickedObject.id) {
        const noradId = parseInt(pickedObject.id);
        setSelectedDebrisId(noradId);
        console.log(`Clicked debris: NORAD ${noradId}`);

        // Find selected debris position
        const selectedPos = debrisPositionsRef.current.find(
          (p) => parseInt(p.noradId) === noradId
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

        // Find the debris object to get orbital period
        const debrisObject = debris.find(d => d.noradId === noradId);
        const orbitPeriod = debrisObject?.orbitPeriod || 5400; // Default to 90 minutes if not found

        // Generate orbit path for exactly one orbital period
        const currentTime = Cesium.JulianDate.toDate(viewer.clock.currentTime);
        // Sample every period/200 to get ~200 points per orbit
        const samplingInterval = Math.max(Math.floor(orbitPeriod / 200), 10); // At least 10 seconds between samples
        const orbitPositions = generateOrbitPath(selectedPos.satrec, currentTime, orbitPeriod, samplingInterval);

        console.log(`Generating orbit for ${orbitPeriod}s period with ${samplingInterval}s sampling (${Math.floor(orbitPeriod / samplingInterval)} points)`);

        if (orbitPositions.length < 2) {
          console.warn('Not enough orbit positions generated');
          return;
        }

        console.log(`Generated ${orbitPositions.length} orbit positions`);

        // Create orbit entity
        const orbitEntity = viewer.entities.add({
          name: `Orbit path for ${selectedPos.name}`,
          polyline: {
            positions: orbitPositions,
            width: 3,
            material: Cesium.Color.CYAN.withAlpha(0.8),
            clampToGround: false,
          },
        });

        orbitPathRef.current = orbitEntity;
        console.log('Orbit path rendered - you should see a cyan line!');

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
      // Restore point collection opacity
      if (pointCollectionRef.current) {
        for (let i = 0; i < pointCollectionRef.current.length; i++) {
          const point = pointCollectionRef.current.get(i);
          point.color = getDebrisColor(point.id ?
            debrisPositionsRef.current.find(p => parseInt(p.noradId) === point.id)?.objectType || '' : ''
          );
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
        if (point.id === selectedDebrisId) {
          point.show = false; // Hide the static point for selected debris
        } else {
          // Dim other points
          const originalColor = getDebrisColor(point.id ?
            debrisPositionsRef.current.find(p => parseInt(p.noradId) === point.id)?.objectType || '' : ''
          );
          point.color = originalColor.withAlpha(0.2);
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

    // Set up animation loop
    const preRenderListener = () => {
      if (!viewer || !animatedEntity || !selectedPos) return;

      // Get current simulation time
      const currentTime = Cesium.JulianDate.toDate(viewer.clock.currentTime);

      // Propagate position
      const result = propagatePosition(selectedPos.satrec, currentTime);

      if (result) {
        animatedEntity.position = new Cesium.ConstantPositionProperty(result.position);
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
    };
  }, [viewer, isAnimating, selectedDebrisId, animationSpeed]);

  return null;
}
