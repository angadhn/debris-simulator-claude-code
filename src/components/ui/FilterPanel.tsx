import { useEffect } from 'react';
import { useUIStore } from '../../stores/ui-store';
import { useDebrisStore } from '../../stores/debris-store';
import './FilterPanel.css';

interface OrbitFilters {
  leo: boolean;
  meo: boolean;
  geo: boolean;
}

interface FilterPanelProps {
  objectCounts: {
    total: number;
    payload: number;
    rocketBody: number;
    debris: number;
    unknown: number;
  };
  orbitFilters: OrbitFilters;
  onOrbitFilterChange: (filters: OrbitFilters) => void;
}

export function FilterPanel({ objectCounts, orbitFilters, onOrbitFilterChange }: FilterPanelProps) {
  const filterPanelOpen = useUIStore((state) => state.filterPanelOpen);
  const setFilterPanelOpen = useUIStore((state) => state.setFilterPanelOpen);
  const filters = useDebrisStore((state) => state.filters);
  const setFilters = useDebrisStore((state) => state.setFilters);

  const handleClose = () => {
    setFilterPanelOpen(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleOrbitFilterToggle = (orbit: keyof OrbitFilters) => {
    const newFilters = { ...orbitFilters, [orbit]: !orbitFilters[orbit] };
    onOrbitFilterChange(newFilters);
  };

  const handleTypeToggle = (type: 'payload' | 'rocketBody' | 'debris' | 'unknown') => {
    const currentType = filters[type];
    setFilters({
      ...filters,
      [type]: {
        ...currentType,
        enabled: !currentType.enabled,
        expanded: !currentType.enabled,
      },
    });
  };

  const handleSizeToggle = (type: 'payload' | 'rocketBody' | 'debris' | 'unknown', size: 'small' | 'medium' | 'large' | 'unknown') => {
    const currentType = filters[type];
    setFilters({
      ...filters,
      [type]: {
        ...currentType,
        sizes: {
          ...currentType.sizes,
          [size]: !currentType.sizes[size],
        },
      },
    });
  };

  const toggleExpanded = (type: 'payload' | 'rocketBody' | 'debris' | 'unknown', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentType = filters[type];
    setFilters({
      ...filters,
      [type]: {
        ...currentType,
        expanded: !currentType.expanded,
      },
    });
  };

  const visibleCount =
    (filters.payload.enabled ? objectCounts.payload : 0) +
    (filters.rocketBody.enabled ? objectCounts.rocketBody : 0) +
    (filters.debris.enabled ? objectCounts.debris : 0) +
    (filters.unknown.enabled ? objectCounts.unknown : 0);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && filterPanelOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [filterPanelOpen]);

  // Body scroll lock
  useEffect(() => {
    if (filterPanelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [filterPanelOpen]);

  if (!filterPanelOpen) return null;

  return (
    <div className="filter-panel-overlay" onClick={handleOverlayClick}>
      <div className="filter-panel-sheet">
        <div className="filter-panel-drag-handle"></div>

        <div className="filter-panel-header">
          <h3>Filters</h3>
          <button className="filter-panel-close-button" onClick={handleClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="filter-panel-content">
          {/* Orbit Range Filters */}
          <div className="filter-section">
            <div className="filter-section-title">Orbit Range</div>
            <div className="filter-options">
              <label className={`filter-checkbox ${orbitFilters.leo ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={orbitFilters.leo}
                  onChange={() => handleOrbitFilterToggle('leo')}
                />
                <span>LEO (&lt;2,000 km)</span>
              </label>
              <label className={`filter-checkbox ${orbitFilters.meo ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={orbitFilters.meo}
                  onChange={() => handleOrbitFilterToggle('meo')}
                />
                <span>MEO (2k-36k km)</span>
              </label>
              <label className={`filter-checkbox ${orbitFilters.geo ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={orbitFilters.geo}
                  onChange={() => handleOrbitFilterToggle('geo')}
                />
                <span>GEO (~36k km)</span>
              </label>
            </div>
          </div>

          <div className="object-count">
            <strong>{visibleCount.toLocaleString()}</strong> of{' '}
            <strong>{objectCounts.total.toLocaleString()}</strong> objects visible
          </div>

          {/* Object Type Filters */}
          <div className="filter-section">
            <div className="filter-section-title">Object Types</div>

            {/* Payload */}
            <div className="type-filter-group">
              <div
                className={`legend-item ${!filters.payload.enabled ? 'disabled' : ''}`}
                onClick={() => handleTypeToggle('payload')}
              >
                <div className="color-box" style={{ backgroundColor: 'white' }}></div>
                <span className="label">Payload / Satellites</span>
                <span className="count">{objectCounts.payload.toLocaleString()}</span>
                {filters.payload.enabled && (
                  <button
                    className="expand-btn"
                    onClick={(e) => toggleExpanded('payload', e)}
                    title="Show size filters"
                  >
                    {filters.payload.expanded ? '▲' : '▼'}
                  </button>
                )}
              </div>
              {filters.payload.expanded && (
                <div className="size-filters">
                  {(['small', 'medium', 'large', 'unknown'] as const).map((size) => (
                    <label
                      key={size}
                      className={`size-checkbox ${filters.payload.sizes[size] ? 'active' : ''}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={filters.payload.sizes[size]}
                        onChange={() => handleSizeToggle('payload', size)}
                      />
                      <span>{size.charAt(0).toUpperCase() + size.slice(1)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Rocket Body */}
            <div className="type-filter-group">
              <div
                className={`legend-item ${!filters.rocketBody.enabled ? 'disabled' : ''}`}
                onClick={() => handleTypeToggle('rocketBody')}
              >
                <div className="color-box" style={{ backgroundColor: 'red' }}></div>
                <span className="label">Rocket Bodies</span>
                <span className="count">{objectCounts.rocketBody.toLocaleString()}</span>
                {filters.rocketBody.enabled && (
                  <button
                    className="expand-btn"
                    onClick={(e) => toggleExpanded('rocketBody', e)}
                    title="Show size filters"
                  >
                    {filters.rocketBody.expanded ? '▲' : '▼'}
                  </button>
                )}
              </div>
              {filters.rocketBody.expanded && (
                <div className="size-filters">
                  {(['small', 'medium', 'large', 'unknown'] as const).map((size) => (
                    <label
                      key={size}
                      className={`size-checkbox ${filters.rocketBody.sizes[size] ? 'active' : ''}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={filters.rocketBody.sizes[size]}
                        onChange={() => handleSizeToggle('rocketBody', size)}
                      />
                      <span>{size.charAt(0).toUpperCase() + size.slice(1)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Debris */}
            <div className="type-filter-group">
              <div
                className={`legend-item ${!filters.debris.enabled ? 'disabled' : ''}`}
                onClick={() => handleTypeToggle('debris')}
              >
                <div className="color-box" style={{ backgroundColor: 'gray' }}></div>
                <span className="label">Debris Fragments</span>
                <span className="count">{objectCounts.debris.toLocaleString()}</span>
                {filters.debris.enabled && (
                  <button
                    className="expand-btn"
                    onClick={(e) => toggleExpanded('debris', e)}
                    title="Show size filters"
                  >
                    {filters.debris.expanded ? '▲' : '▼'}
                  </button>
                )}
              </div>
              {filters.debris.expanded && (
                <div className="size-filters">
                  {(['small', 'medium', 'large', 'unknown'] as const).map((size) => (
                    <label
                      key={size}
                      className={`size-checkbox ${filters.debris.sizes[size] ? 'active' : ''}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={filters.debris.sizes[size]}
                        onChange={() => handleSizeToggle('debris', size)}
                      />
                      <span>{size.charAt(0).toUpperCase() + size.slice(1)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Unknown */}
            {objectCounts.unknown > 0 && (
              <div className="type-filter-group">
                <div
                  className={`legend-item ${!filters.unknown.enabled ? 'disabled' : ''}`}
                  onClick={() => handleTypeToggle('unknown')}
                >
                  <div className="color-box" style={{ backgroundColor: 'yellow' }}></div>
                  <span className="label">Unknown Type</span>
                  <span className="count">{objectCounts.unknown.toLocaleString()}</span>
                  {filters.unknown.enabled && (
                    <button
                      className="expand-btn"
                      onClick={(e) => toggleExpanded('unknown', e)}
                      title="Show size filters"
                    >
                      {filters.unknown.expanded ? '▲' : '▼'}
                    </button>
                  )}
                </div>
                {filters.unknown.expanded && (
                  <div className="size-filters">
                    {(['small', 'medium', 'large', 'unknown'] as const).map((size) => (
                      <label
                        key={size}
                        className={`size-checkbox ${filters.unknown.sizes[size] ? 'active' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={filters.unknown.sizes[size]}
                          onChange={() => handleSizeToggle('unknown', size)}
                        />
                        <span>{size.charAt(0).toUpperCase() + size.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="legend-hint">
            Click to show/hide types • Click ▼ for sizes
          </div>
        </div>
      </div>
    </div>
  );
}
