import { useEffect, useRef, useMemo } from 'react';
import * as Cesium from 'cesium';
import { useDebrisStore } from '../../stores/debris-store';
import { propagateAllDebris, getDebrisColor, generateOrbitPath } from '../../utils/orbital-propagation';
import type { TLEData } from '../../services/debris-api';
import type { DebrisPosition } from '../../utils/orbital-propagation';

interface DebrisLayerProps {
  viewer: Cesium.Viewer | null;
}

export function DebrisLayer({ viewer }: DebrisLayerProps) {
  const debris = useDebrisStore((state) => state.debris);
  const filters = useDebrisStore((state) => state.filters);
  const orbitFilters = useDebrisStore((state) => state.orbitFilters);
  const sizeFilters = useDebrisStore((state) => state.sizeFilters);
  const searchQuery = useDebrisStore((state) => state.searchQuery);
  const setSelectedDebrisId = useDebrisStore((state) => state.setSelectedDebrisId);

  const pointCollectionRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const orbitPathRef = useRef<Cesium.Entity | null>(null);
  const debrisPositionsRef = useRef<DebrisPosition[]>([]);

  // Filter debris based on all filters
  const filteredDebris = useMemo(() => {
    return debris.filter((d) => {
      // Type filter
      const type = d.objectType.toUpperCase();
      if (type.includes('PAYLOAD') && !filters.showPayload) return false;
      if ((type.includes('ROCKET') || type.includes('R/B')) && !filters.showRocketBody) return false;
      if (type.includes('DEBRIS') && !filters.showDebris) return false;
      if (!type.includes('PAYLOAD') && !type.includes('ROCKET') && !type.includes('DEBRIS') && !filters.showUnknown) return false;

      // Orbit range filter (using apogee in km)
      const apogee = d.apogee || 0;
      if (apogee < 2000 && !orbitFilters.leo) return false;
      if (apogee >= 2000 && apogee < 35000 && !orbitFilters.meo) return false;
      if (apogee >= 35000 && !orbitFilters.geo) return false;

      // Size filter (RCS_SIZE field)
      // Note: Many objects don't have RCS_SIZE, so we'll allow them through if any size filter is active
      const rcsSize = d.rcsSize?.toUpperCase();
      if (rcsSize) {
        if (rcsSize === 'SMALL' && !sizeFilters.small) return false;
        if (rcsSize === 'MEDIUM' && !sizeFilters.medium) return false;
        if (rcsSize === 'LARGE' && !sizeFilters.large) return false;
      }

      // Search filter (name or NORAD ID)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(query);
        const matchesNorad = d.noradId.toString().includes(query);
        if (!matchesName && !matchesNorad) return false;
      }

      return true;
    });
  }, [debris, filters, orbitFilters, sizeFilters, searchQuery]);

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

        // Generate orbit path
        const currentTime = Cesium.JulianDate.toDate(viewer.clock.currentTime);
        const orbitPositions = generateOrbitPath(selectedPos.satrec, currentTime, 6000, 60);

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

  return null;
}
