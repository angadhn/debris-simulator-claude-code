import { useEffect, useRef, useState, useMemo } from 'react';
import * as Cesium from 'cesium';
import { useUIStore } from '../../stores/ui-store';
import { FallbackViewer } from './FallbackViewer';
import { DebrisLayer } from './DebrisLayer';
import { useDebrisData } from '../../hooks/useDebrisData';
import { DebrisLegend } from '../ui/DebrisLegend';
import { DebrisInfoPanel } from '../ui/DebrisInfoPanel';
import { DebrisSearchPanel } from '../ui/DebrisSearchPanel';
import { useDebrisStore } from '../../stores/debris-store';

// Global defined by Vite
declare const CESIUM_BASE_URL: string;

interface OrbitalViewerProps {
  className?: string;
}

export function OrbitalViewer({ className = '' }: OrbitalViewerProps) {
  console.log('OrbitalViewer component rendering');

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const setCesiumViewer = useUIStore(state => state.setCesiumViewer);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch debris data (load all active objects)
  const { loading: debrisLoading, error: debrisError } = useDebrisData('active', 30000, true);

  // Get debris state for legend
  const debris = useDebrisStore((state) => state.debris);
  const filters = useDebrisStore((state) => state.filters);
  const orbitFilters = useDebrisStore((state) => state.orbitFilters);
  const setOrbitFilters = useDebrisStore((state) => state.setOrbitFilters);
  const countryFilters = useDebrisStore((state) => state.countryFilters);
  const searchQuery = useDebrisStore((state) => state.searchQuery);
  const setSearchQuery = useDebrisStore((state) => state.setSearchQuery);
  const totalObjectsAvailable = useDebrisStore((state) => state.totalObjectsAvailable);

  // Calculate filtered debris count (applying ALL filters)
  const objectCounts = useMemo(() => {
    // Apply all filters to debris
    const filtered = debris.filter((d) => {
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
        if (rcsSize === 'SMALL' && !typeFilters.small) return false;
        if (rcsSize === 'MEDIUM' && !typeFilters.medium) return false;
        if (rcsSize === 'LARGE' && !typeFilters.large) return false;
      } else {
        if (!typeFilters.unknown) return false;
      }

      // Orbit range filter
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

      // Search filter
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

    // Count by type (from total debris, not filtered)
    const counts = {
      total: debris.length,
      filtered: filtered.length,
      payload: 0,
      rocketBody: 0,
      debris: 0,
      unknown: 0,
    };

    debris.forEach((d) => {
      const type = d.objectType.toUpperCase();
      if (type.includes('PAYLOAD')) {
        counts.payload++;
      } else if (type.includes('ROCKET') || type.includes('R/B')) {
        counts.rocketBody++;
      } else if (type.includes('DEBRIS')) {
        counts.debris++;
      } else {
        counts.unknown++;
      }
    });

    return counts;
  }, [debris, filters, orbitFilters, countryFilters, searchQuery]);

  useEffect(() => {
    console.log('OrbitalViewer useEffect running, containerRef:', containerRef.current);
    if (!containerRef.current) {
      console.warn('containerRef.current is null, skipping Cesium initialization');
      return;
    }

    // Don't recreate viewer if it already exists or is being initialized
    if (viewerRef.current) {
      console.log('Cesium viewer already exists, skipping recreation');
      return;
    }

    if (isInitializingRef.current) {
      console.log('Cesium viewer already initializing, skipping duplicate initialization');
      return;
    }

    isInitializingRef.current = true;

    // Set a timeout to show fallback after 10 seconds (increased for debugging)
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Cesium taking too long to load (10+ seconds), keeping fallback');
        console.warn('This usually means an error occurred. Check console for errors above.');
        setLoading(false);
      }
    }, 10000);

    const initializeCesium = async () => {
      try {
        setLoading(true);
        setError(null);

        // Token will be set below after viewer creation
        const token = import.meta.env.VITE_CESIUM_ION_TOKEN;
        console.log('Cesium token:', token ? 'Token provided' : 'No token');

        console.log('Initializing Cesium viewer...');
        console.log('CESIUM_BASE_URL:', CESIUM_BASE_URL);

        // Add a small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('Creating Cesium.Viewer instance...');

        // Initialize Cesium viewer with basic configuration
        const viewer = new Cesium.Viewer(containerRef.current!, {
          // Disable UI widgets initially
          animation: false,
          timeline: false,
          fullscreenButton: false,
          vrButton: false,
          geocoder: false,
          homeButton: true,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          baseLayerPicker: false, // Disable picker — Ion options need valid token
          baseLayer: false, // Don't auto-load Ion imagery (fails without valid token)
        });

        console.log('Cesium viewer created successfully');

        // Load imagery: try Ion first, fall back to bundled NaturalEarthII
        try {
          if (token && token !== 'your_cesium_ion_token_here') {
            Cesium.Ion.defaultAccessToken = token;
            const ionImagery = await Cesium.IonImageryProvider.fromAssetId(2);
            viewer.imageryLayers.addImageryProvider(ionImagery);
            console.log('Using Cesium Ion (Bing Maps) imagery');
          } else {
            throw new Error('No valid Cesium Ion token');
          }
        } catch (e) {
          console.warn('Cesium Ion imagery unavailable, using offline NaturalEarth fallback:', e);
          try {
            const fallback = await Cesium.TileMapServiceImageryProvider.fromUrl(
              Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
            );
            viewer.imageryLayers.addImageryProvider(fallback);
          } catch (fallbackErr) {
            console.warn('NaturalEarth fallback also failed:', fallbackErr);
            // Globe will render as a plain ellipsoid — still functional
          }
        }

        // Configure for space visualization
        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.showGroundAtmosphere = true;
        
        // Set camera to show Earth from space
        viewer.scene.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(-75.0, 40.0, 10000000), // 10,000km altitude
        });

        // Use Cesium's default star background if available, otherwise dark space
        try {
          viewer.scene.skyBox = new Cesium.SkyBox({
            sources: {
              positiveX: '/cesium/Assets/Textures/SkyBox/tycho2t3_80_px.jpg',
              negativeX: '/cesium/Assets/Textures/SkyBox/tycho2t3_80_mx.jpg',
              positiveY: '/cesium/Assets/Textures/SkyBox/tycho2t3_80_py.jpg',
              negativeY: '/cesium/Assets/Textures/SkyBox/tycho2t3_80_my.jpg',
              positiveZ: '/cesium/Assets/Textures/SkyBox/tycho2t3_80_pz.jpg',
              negativeZ: '/cesium/Assets/Textures/SkyBox/tycho2t3_80_mz.jpg'
            }
          });
        } catch (skyboxError) {
          console.warn('Could not load star skybox, using default:', skyboxError);
          // Keep default skybox
        }

        // Store viewer reference
        viewerRef.current = viewer;
        setCesiumViewer(viewer);
        clearTimeout(timeoutId);
        setLoading(false);
        isInitializingRef.current = false;

        console.log('Cesium initialization complete');

      } catch (err) {
        console.error('Cesium initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize Cesium');
        clearTimeout(timeoutId);
        setLoading(false);
        isInitializingRef.current = false;
      }
    };

    initializeCesium();

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      isInitializingRef.current = false;
      if (viewerRef.current) {
        console.log('Cleaning up Cesium viewer');
        viewerRef.current.destroy();
        viewerRef.current = null;
        setCesiumViewer(null);
      }
    };
  }, [setCesiumViewer]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Always render the container so ref is available */}
      <div
        className={`cesium-container ${className}`}
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          visibility: loading || error ? 'hidden' : 'visible'
        }}
      />

      {/* Render debris layer and UI components once Cesium is loaded */}
      {!loading && !error && viewerRef.current && (
        <>
          <DebrisLayer viewer={viewerRef.current} />
          {debris.length > 0 && (
            <>
              <DebrisSearchPanel
                className="desktop-only"
                onSearch={setSearchQuery}
                totalObjects={totalObjectsAvailable || debris.length}
                displayedObjects={debris.length}
              />
              <DebrisLegend
                className="desktop-only"
                objectCounts={objectCounts}
                orbitFilters={orbitFilters}
                onOrbitFilterChange={setOrbitFilters}
              />
              <DebrisInfoPanel />
            </>
          )}
        </>
      )}

      {/* Show fallback/error overlay while loading or on error */}
      {(loading || debrisLoading) && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
          <FallbackViewer className={className} />
          {debrisLoading && !loading && (
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              fontSize: '14px'
            }}>
              Loading debris data...
            </div>
          )}
        </div>
      )}

      {(error || debrisError) && (
        <div className={`cesium-error ${className}`} style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: '#1a1a1a',
          color: '#ff6b6b'
        }}>
          <h3>{error ? 'Cesium Error' : 'Debris Data Error'}</h3>
          <p>{error || debrisError}</p>
          <small>Check browser console for details</small>
        </div>
      )}
    </div>
  );
}