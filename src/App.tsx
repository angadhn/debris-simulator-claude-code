import { useEffect } from 'react';
import { useUIStore } from './stores/ui-store';
import { useDebrisStore } from './stores/debris-store';
import { DebrisAPI } from './services/debris-api';
import { convertTLEArrayToDebrisObjects } from './utils/tle-converter';
import { OrbitalViewer } from './components/cesium/OrbitalViewer';
import { SimulationViewer } from './components/simulation/SimulationViewer';
import { ViewSwitcher } from './components/ui/ViewSwitcher';
import { HamburgerMenu } from './components/ui/HamburgerMenu';
import { CollapsibleSearchButton } from './components/ui/CollapsibleSearchButton';
import { FilterButton } from './components/ui/FilterButton';
import { FilterPanel } from './components/ui/FilterPanel';
import { WelcomeTutorial, useWelcomeTutorial } from './components/ui/WelcomeTutorial';
import { useObjectCounts } from './hooks/useObjectCounts';
import './App.css'
import './mobile.css'

function App() {
  const viewMode = useUIStore(state => state.viewMode);
  const setSearchQuery = useDebrisStore((state) => state.setSearchQuery);
  const orbitFilters = useDebrisStore((state) => state.orbitFilters);
  const setOrbitFilters = useDebrisStore((state) => state.setOrbitFilters);
  const addDebrisObjects = useDebrisStore((state) => state.addDebrisObjects);
  const setSelectedDebrisId = useDebrisStore((state) => state.setSelectedDebrisId);
  const setSearchResults = useDebrisStore((state) => state.setSearchResults);

  // Get object counts for FilterPanel
  const objectCounts = useObjectCounts();

  // Welcome tutorial
  const { showTutorial, openTutorial, closeTutorial } = useWelcomeTutorial();

  // Deep-link from external sites (e.g. the Orbital Flight School TA,
  // Orbo) via /?q=<term>. Mirrors the search-button flow:
  //   1. Set the in-memory search filter so loaded debris is filtered.
  //   2. Hit /api/search to fetch matching satellites from Space-Track.
  //   3. Add results to the debris store so the 3-D viewer renders them.
  //   4. Single hit auto-selects; multiple hits land in the search list.
  // Non-breaking — if no ?q= param is present, the effect is a no-op.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')?.trim();
    if (!q || q.length < 3) return;
    setSearchQuery(q);
    let cancelled = false;
    (async () => {
      try {
        const { data: results, total } = await DebrisAPI.searchByName(q, 50, 0);
        if (cancelled) return;
        if (results.length === 0) return;
        const debrisObjects = convertTLEArrayToDebrisObjects(results);
        if (debrisObjects.length === 1 && total === 1) {
          addDebrisObjects(debrisObjects);
          setSelectedDebrisId(debrisObjects[0].noradId);
        } else {
          addDebrisObjects(debrisObjects);
          setSearchResults(debrisObjects);
        }
      } catch (err) {
        console.error('Deep-link search failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSearchQuery, addDebrisObjects, setSelectedDebrisId, setSearchResults]);

  return (
    <div className="app">
      <header className="app-header">
        {/* Mobile components */}
        <CollapsibleSearchButton onSearch={setSearchQuery} />
        <h1 className="mobile-title">Space Debris</h1>
        <HamburgerMenu onHelpClick={openTutorial} />

        {/* Desktop components */}
        <h1 className="desktop-title">Space Debris Visualization & Capture Simulator</h1>
        <ViewSwitcher className="desktop-view-switcher" onHelpClick={openTutorial} />
      </header>

      <main className="app-main">
        {viewMode === 'orbital' ? (
          <OrbitalViewer className="main-viewer" />
        ) : (
          <SimulationViewer />
        )}

        {/* Mobile filter button */}
        <FilterButton />
      </main>

      {/* Mobile filter panel */}
      <FilterPanel
        objectCounts={objectCounts}
        orbitFilters={orbitFilters}
        onOrbitFilterChange={setOrbitFilters}
      />

      {/* Welcome tutorial - auto-shows on first visit */}
      <WelcomeTutorial />

      {/* Manually triggered tutorial */}
      {showTutorial && <WelcomeTutorial forceShow={true} onClose={closeTutorial} />}
    </div>
  )
}

export default App
