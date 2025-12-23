import { useUIStore } from '../../stores/ui-store';
import type { ViewMode } from '../../types/simulation';

interface ViewSwitcherProps {
  className?: string;
}

export function ViewSwitcher({ className = '' }: ViewSwitcherProps = {}) {
  const { viewMode, setViewMode } = useUIStore();

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  return (
    <div className={`view-switcher ${className}`}>
      <div className="view-switcher-buttons">
        <button
          className={`view-button ${viewMode === 'orbital' ? 'active' : ''}`}
          onClick={() => handleModeChange('orbital')}
        >
          Orbital View
        </button>
        <button
          className={`view-button ${viewMode === 'simulation' ? 'active' : ''}`}
          onClick={() => handleModeChange('simulation')}
        >
          Simulation View
        </button>
      </div>
    </div>
  );
}