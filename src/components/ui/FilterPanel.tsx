import { useEffect, useMemo, useState } from 'react';
import { useUIStore } from '../../stores/ui-store';
import { useDebrisStore } from '../../stores/debris-store';
import './FilterPanel.css';

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
  const propagationMode = useUIStore((state) => state.propagationMode);
  const setPropagationMode = useUIStore((state) => state.setPropagationMode);
  const filters = useDebrisStore((state) => state.filters);
  const setFilters = useDebrisStore((state) => state.setFilters);
  const debris = useDebrisStore((state) => state.debris);
  const searchQuery = useDebrisStore((state) => state.searchQuery);
  const countryFilters = useDebrisStore((state) => state.countryFilters);
  const setCountryFilters = useDebrisStore((state) => state.setCountryFilters);

  const [showCountryFilter, setShowCountryFilter] = useState(false);

  // Extract unique countries from debris data
  const availableCountries = useMemo(() => {
    const countries = new Map<string, number>();
    debris.forEach((d) => {
      const country = d.countryCode || 'UNKNOWN';
      countries.set(country, (countries.get(country) || 0) + 1);
    });
    // Sort by count descending
    return Array.from(countries.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count }));
  }, [debris]);

  const handleClose = () => {
    setFilterPanelOpen(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

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

  const handleCountryToggle = (countryCode: string) => {
    if (countryFilters.includes(countryCode)) {
      setCountryFilters(countryFilters.filter((c) => c !== countryCode));
    } else {
      setCountryFilters([...countryFilters, countryCode]);
    }
  };

  const handleClearCountryFilters = () => {
    setCountryFilters([]);
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

  // Calculate actual visible count based on ALL filters (including search)
  const visibleCount = useMemo(() => {
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
        if (orbitFilters.leoExpanded) {
          const isSSO = inclination >= 96 && inclination <= 99;
          const isPolar = inclination >= 80 && inclination < 96;
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

      // Country filter
      if (countryFilters.length > 0) {
        const countryCode = d.countryCode || 'UNKNOWN';
        if (!countryFilters.includes(countryCode)) return false;
      }

      return true;
    }).length;
  }, [debris, filters, orbitFilters, searchQuery, countryFilters]);

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
                    <label className={`sub-filter-checkbox ${orbitFilters.leoSub.sso ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={orbitFilters.leoSub.sso}
                        onChange={() => handleLeoSubFilterToggle('sso')}
                      />
                      <span>SSO (96-99°)</span>
                    </label>
                    <label className={`sub-filter-checkbox ${orbitFilters.leoSub.polar ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={orbitFilters.leoSub.polar}
                        onChange={() => handleLeoSubFilterToggle('polar')}
                      />
                      <span>Polar (80-96°)</span>
                    </label>
                    <label className={`sub-filter-checkbox ${orbitFilters.leoSub.iss ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={orbitFilters.leoSub.iss}
                        onChange={() => handleLeoSubFilterToggle('iss')}
                      />
                      <span>ISS-type (50-53°)</span>
                    </label>
                    <label className={`sub-filter-checkbox ${orbitFilters.leoSub.equatorial ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={orbitFilters.leoSub.equatorial}
                        onChange={() => handleLeoSubFilterToggle('equatorial')}
                      />
                      <span>Equatorial (0-15°)</span>
                    </label>
                    <label className={`sub-filter-checkbox ${orbitFilters.leoSub.other ? 'active' : ''}`}>
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

          {/* Country/Organization Filter */}
          <div className="filter-section">
            <div
              className="filter-section-title clickable"
              onClick={() => setShowCountryFilter(!showCountryFilter)}
            >
              <span>
                Country/Organization
                {countryFilters.length > 0 && (
                  <span className="filter-badge">{countryFilters.length}</span>
                )}
              </span>
              <span className="expand-arrow">{showCountryFilter ? '▲' : '▼'}</span>
            </div>
            {showCountryFilter && (
              <>
                {countryFilters.length > 0 && (
                  <button className="clear-all-btn" onClick={handleClearCountryFilters}>
                    Clear All
                  </button>
                )}
                <div className="country-filter-list">
                  {availableCountries.slice(0, 15).map(({ code, count }) => (
                    <label key={code} className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={countryFilters.includes(code)}
                        onChange={() => handleCountryToggle(code)}
                      />
                      <span>
                        {code} <span className="filter-count">({count.toLocaleString()})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Propagation Mode */}
          <div className="filter-section">
            <div className="filter-section-title">Propagation Mode</div>
            <div className="propagation-mode-buttons">
              <button
                className={`propagation-btn ${propagationMode === 'sgp4' ? 'active' : ''}`}
                onClick={() => setPropagationMode('sgp4')}
              >
                <div className="btn-label">SGP4</div>
                <div className="btn-desc">Accurate</div>
              </button>
              <button
                className={`propagation-btn ${propagationMode === 'kepler' ? 'active' : ''}`}
                onClick={() => setPropagationMode('kepler')}
              >
                <div className="btn-label">Kepler</div>
                <div className="btn-desc">Fast</div>
              </button>
            </div>
            <div className="propagation-info">
              {propagationMode === 'sgp4'
                ? 'Full orbital perturbations (slower, accurate)'
                : '2-body mechanics (100-200x faster, ~1% error)'}
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
