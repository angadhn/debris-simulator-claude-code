import { useEffect, useRef, useState, useMemo } from 'react';
import * as Cesium from 'cesium';
import { useUIStore } from '../../stores/ui-store';
import { FallbackViewer } from './FallbackViewer';
import { DebrisLayer } from './DebrisLayer';
import { useDebrisData } from '../../hooks/useDebrisData';
import { DebrisLegend } from '../ui/DebrisLegend';
import { DebrisInfoPanel } from '../ui/DebrisInfoPanel';
import { TimeControls } from '../ui/TimeControls';
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

  // Fetch debris data (limit to 1000 for initial testing)
  const { loading: debrisLoading, error: debrisError } = useDebrisData('active', 1000, true);

  // Get debris state for legend
  const debris = useDebrisStore((state) => state.debris);
  const setOrbitFilters = useDebrisStore((state) => state.setOrbitFilters);
  const setSizeFilters = useDebrisStore((state) => state.setSizeFilters);
  const setSearchQuery = useDebrisStore((state) => state.setSearchQuery);
  const totalObjectsAvailable = useDebrisStore((state) => state.totalObjectsAvailable);

  // Calculate object counts by type
  const objectCounts = useMemo(() => {
    const counts = {
      total: debris.length,
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
  }, [debris]);

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

        // Set Cesium Ion token
        const token = import.meta.env.VITE_CESIUM_ION_TOKEN;
        console.log('Cesium token:', token ? 'Token provided' : 'No token');
        
        if (token && token !== 'your_cesium_ion_token_here') {
          Cesium.Ion.defaultAccessToken = token;
        }

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
          
          // Use basic imagery instead of Ion for now
          imageryProvider: new Cesium.OpenStreetMapImageryProvider({
            url: 'https://a.tile.openstreetmap.org/'
          }),
          
          // Don't use world terrain to avoid Ion dependency
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        });

        console.log('Cesium viewer created successfully');

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
                onSearch={setSearchQuery}
                onOrbitFilterChange={setOrbitFilters}
                onSizeFilterChange={setSizeFilters}
                totalObjects={totalObjectsAvailable || debris.length}
                displayedObjects={debris.length}
              />
              <DebrisLegend
                objectCounts={objectCounts}
              />
              <DebrisInfoPanel />
              <TimeControls viewer={viewerRef.current} />
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