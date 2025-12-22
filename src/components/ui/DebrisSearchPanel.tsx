import { useState, useEffect } from 'react';
import { DebrisAPI } from '../../services/debris-api';
import { useDebrisStore } from '../../stores/debris-store';
import { convertTLEArrayToDebrisObjects } from '../../utils/tle-converter';
import './DebrisSearchPanel.css';

interface OrbitFilters {
  leo: boolean;
  meo: boolean;
  geo: boolean;
}

interface SizeFilters {
  small: boolean;
  medium: boolean;
  large: boolean;
}

interface DebrisSearchPanelProps {
  onSearch: (query: string) => void;
  onOrbitFilterChange: (filters: OrbitFilters) => void;
  onSizeFilterChange: (filters: SizeFilters) => void;
  totalObjects: number;
  displayedObjects: number;
}

export function DebrisSearchPanel({
  onSearch,
  onOrbitFilterChange,
  onSizeFilterChange,
  totalObjects,
  displayedObjects,
}: DebrisSearchPanelProps) {
  const addDebrisObjects = useDebrisStore((state) => state.addDebrisObjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [realTotalCount, setRealTotalCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [orbitFilters, setOrbitFilters] = useState<OrbitFilters>({
    leo: true,
    meo: true,
    geo: true,
  });
  const [sizeFilters, setSizeFilters] = useState<SizeFilters>({
    small: true,
    medium: true,
    large: true,
  });

  // Fetch real count from Space-Track on mount
  useEffect(() => {
    const fetchRealCount = async () => {
      try {
        setIsLoadingCount(true);
        const count = await DebrisAPI.getObjectCount('active');
        setRealTotalCount(count);
      } catch (error) {
        console.error('Failed to fetch real object count:', error);
      } finally {
        setIsLoadingCount(false);
      }
    };
    fetchRealCount();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    // Apply local filter immediately as user types
    onSearch(query);
  };

  const handleSearchClick = async () => {
    const query = searchQuery.trim();

    // If query is at least 3 characters, search Space-Track for matching objects
    if (query.length >= 3) {
      try {
        setIsSearching(true);
        const results = await DebrisAPI.searchByName(query, 10);

        if (results.length > 0) {
          // Convert TLE data to DebrisObject format
          const debrisObjects = convertTLEArrayToDebrisObjects(results);
          // Add to store (duplicates will be filtered out)
          addDebrisObjects(debrisObjects);
          console.log(`Added ${debrisObjects.length} objects from search to visualization`);
        } else {
          console.log(`No objects found matching "${query}"`);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  const handleOrbitFilterToggle = (orbit: keyof OrbitFilters) => {
    const newFilters = { ...orbitFilters, [orbit]: !orbitFilters[orbit] };
    setOrbitFilters(newFilters);
    onOrbitFilterChange(newFilters);
  };

  const handleSizeFilterToggle = (size: keyof SizeFilters) => {
    const newFilters = { ...sizeFilters, [size]: !sizeFilters[size] };
    setSizeFilters(newFilters);
    onSizeFilterChange(newFilters);
  };

  return (
    <div className="debris-search-panel">
      <div className="search-header">
        <h3>Search & Filters</h3>
        <span className="search-info" title="Space-Track.org has ~25,000+ total tracked objects">
          Showing {displayedObjects.toLocaleString()} of {totalObjects.toLocaleString()} loaded
        </span>
      </div>

      <div className="search-input-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name or NORAD ID..."
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyPress={handleKeyPress}
          disabled={isSearching}
        />
        <button
          className="search-button"
          onClick={handleSearchClick}
          disabled={isSearching || searchQuery.trim().length < 3}
          title="Search Space-Track for this object"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

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

      <div className="filter-section">
        <div className="filter-section-title">Object Size (RCS)</div>
        <div className="filter-options">
          <label className={`filter-checkbox ${sizeFilters.small ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={sizeFilters.small}
              onChange={() => handleSizeFilterToggle('small')}
            />
            <span>Small</span>
          </label>
          <label className={`filter-checkbox ${sizeFilters.medium ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={sizeFilters.medium}
              onChange={() => handleSizeFilterToggle('medium')}
            />
            <span>Medium</span>
          </label>
          <label className={`filter-checkbox ${sizeFilters.large ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={sizeFilters.large}
              onChange={() => handleSizeFilterToggle('large')}
            />
            <span>Large</span>
          </label>
        </div>
      </div>

      <div className="total-count">
        <strong>ⓘ</strong> Space-Track.org tracks{' '}
        {isLoadingCount ? (
          <strong>loading...</strong>
        ) : realTotalCount !== null ? (
          <strong>{realTotalCount.toLocaleString()}</strong>
        ) : (
          <strong>~25,000+</strong>
        )}{' '}
        total active objects.
        <br />
        Currently loading first <strong>1,000</strong> for performance.
      </div>
    </div>
  );
}
