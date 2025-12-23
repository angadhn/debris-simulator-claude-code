import { useUIStore } from './stores/ui-store';
import { useDebrisStore } from './stores/debris-store';
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

  // Get object counts for FilterPanel
  const objectCounts = useObjectCounts();

  // Welcome tutorial
  const { showTutorial, openTutorial, closeTutorial } = useWelcomeTutorial();

  return (
    <div className="app">
      <header className="app-header">
        {/* Mobile components */}
        <CollapsibleSearchButton onSearch={setSearchQuery} />
        <h1 className="mobile-title">Space Debris</h1>
        <HamburgerMenu />

        {/* Desktop components */}
        <h1 className="desktop-title">Space Debris Visualization & Capture Simulator</h1>
        <ViewSwitcher className="desktop-view-switcher" />
      </header>

      <main className="app-main">
        {viewMode === 'orbital' ? (
          <OrbitalViewer className="main-viewer" />
        ) : (
          <SimulationViewer />
        )}

        {/* Mobile filter button */}
        <FilterButton />

        {/* Help button - positioned near Cesium controls */}
        <button className="help-button" onClick={openTutorial} aria-label="Help" title="Show tutorial">
          ?
        </button>
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
