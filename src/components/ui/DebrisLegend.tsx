import { useState } from 'react';
import { useDebrisStore } from '../../stores/debris-store';
import './DebrisLegend.css';

interface LeoSubFilters {
  sso: boolean;
  polar: boolean;
  iss: boolean;
  equatorial: boolean;
  other: boolean;
}

interface OrbitFilters {
  leo: boolean;
  leoExpanded: boolean;
  leoSub: LeoSubFilters;
  meo: boolean;
  geo: boolean;
}

interface DebrisLegendProps {
  objectCounts: {
    total: number;
    filtered: number;
    payload: number;
    rocketBody: number;
    debris: number;
    unknown: number;
  };
  orbitFilters: OrbitFilters;
  onOrbitFilterChange: (filters: OrbitFilters) => void;
  className?: string;
}

export function DebrisLegend({ objectCounts, orbitFilters, onOrbitFilterChange, className = '' }: DebrisLegendProps) {
  const [collapsed, setCollapsed] = useState(false);
  const filters = useDebrisStore((state) => state.filters);
  const setFilters = useDebrisStore((state) => state.setFilters);

  const handleOrbitFilterToggle = (orbit: 'leo' | 'meo' | 'geo') => {
    const newFilters = { ...orbitFilters, [orbit]: !orbitFilters[orbit] };
    onOrbitFilterChange(newFilters);
  };

  const handleLeoExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOrbitFilterChange({ ...orbitFilters, leoExpanded: !orbitFilters.leoExpanded });
  };

  const handleLeoSubFilterToggle = (subFilter: keyof LeoSubFilters) => {
    const newLeoSub = { ...orbitFilters.leoSub, [subFilter]: !orbitFilters.leoSub[subFilter] };
    onOrbitFilterChange({ ...orbitFilters, leoSub: newLeoSub });
  };

  const handleTypeToggle = (type: 'payload' | 'rocketBody' | 'debris' | 'unknown') => {
    const currentType = filters[type];
    setFilters({
      ...filters,
      [type]: {
        ...currentType,
        enabled: !currentType.enabled,
        expanded: !currentType.enabled, // Auto-expand when enabling
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

  return (
    <div className={`debris-legend ${collapsed ? 'collapsed' : ''} ${className}`}>
      <div className="legend-header" onClick={() => setCollapsed(!collapsed)}>
        <h3>Space Debris</h3>
        <button className="collapse-btn">{collapsed ? '▼' : '▲'}</button>
      </div>

      {!collapsed && (
        <div className="legend-content">
          {/* Orbit Range Filters */}
          <div className="filter-section">
            <div className="filter-section-title">Orbit Range</div>
            <div className="filter-options">
              {/* LEO with expandable sub-filters */}
              <div className="orbit-filter-group">
                <div className="orbit-filter-row">
                  <label className={`filter-checkbox ${orbitFilters.leo ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={orbitFilters.leo}
                      onChange={() => handleOrbitFilterToggle('leo')}
                    />
                    <span>LEO (&lt;2,000 km)</span>
                  </label>
                  {orbitFilters.leo && (
                    <button
                      className="orbit-expand-btn"
                      onClick={handleLeoExpandToggle}
                      title="Filter by inclination"
                    >
                      {orbitFilters.leoExpanded ? '▲' : '▼'}
                    </button>
                  )}
                </div>
                {orbitFilters.leo && orbitFilters.leoExpanded && (
                  <div className="leo-sub-filters">
                    <label
                      className={`sub-filter-checkbox ${orbitFilters.leoSub.sso ? 'active' : ''}`}
                      title="Sun-Synchronous Orbit: 96-99° inclination"
                    >
                      <input
                        type="checkbox"
                        checked={orbitFilters.leoSub.sso}
                        onChange={() => handleLeoSubFilterToggle('sso')}
                      />
                      <span>SSO (96-99°)</span>
                    </label>
                    <label
                      className={`sub-filter-checkbox ${orbitFilters.leoSub.polar ? 'active' : ''}`}
                      title="Polar Orbit: 80-100° inclination (excludes SSO)"
                    >
                      <input
                        type="checkbox"
                        checked={orbitFilters.leoSub.polar}
                        onChange={() => handleLeoSubFilterToggle('polar')}
                      />
                      <span>Polar (80-96°)</span>
                    </label>
                    <label
                      className={`sub-filter-checkbox ${orbitFilters.leoSub.iss ? 'active' : ''}`}
                      title="ISS-type Orbit: 50-53° inclination"
                    >
                      <input
                        type="checkbox"
                        checked={orbitFilters.leoSub.iss}
                        onChange={() => handleLeoSubFilterToggle('iss')}
                      />
                      <span>ISS-type (50-53°)</span>
                    </label>
                    <label
                      className={`sub-filter-checkbox ${orbitFilters.leoSub.equatorial ? 'active' : ''}`}
                      title="Equatorial LEO: 0-15° inclination"
                    >
                      <input
                        type="checkbox"
                        checked={orbitFilters.leoSub.equatorial}
                        onChange={() => handleLeoSubFilterToggle('equatorial')}
                      />
                      <span>Equatorial (0-15°)</span>
                    </label>
                    <label
                      className={`sub-filter-checkbox ${orbitFilters.leoSub.other ? 'active' : ''}`}
                      title="Other LEO inclinations"
                    >
                      <input
                        type="checkbox"
                        checked={orbitFilters.leoSub.other}
                        onChange={() => handleLeoSubFilterToggle('other')}
                      />
                      <span>Other LEO</span>
                    </label>
                  </div>
                )}
              </div>

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
            <strong>{objectCounts.filtered.toLocaleString()}</strong> of{' '}
            <strong>{objectCounts.total.toLocaleString()}</strong> objects visible
          </div>

          <div className="legend-items">
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
      )}
    </div>
  );
}
