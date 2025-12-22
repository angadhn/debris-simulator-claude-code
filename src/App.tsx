import { useUIStore } from './stores/ui-store';
import { OrbitalViewer } from './components/cesium/OrbitalViewer';
import { SimulationViewer } from './components/simulation/SimulationViewer';
import { ViewSwitcher } from './components/ui/ViewSwitcher';
import './App.css'
import './mobile.css'

function App() {
  const viewMode = useUIStore(state => state.viewMode);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Space Debris Visualization & Capture Simulator</h1>
        <ViewSwitcher />
      </header>
      
      <main className="app-main">
        {viewMode === 'orbital' ? (
          <OrbitalViewer className="main-viewer" />
        ) : (
          <SimulationViewer />
        )}
      </main>
    </div>
  )
}

export default App
