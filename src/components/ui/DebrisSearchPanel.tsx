import { useState, useEffect, useMemo } from 'react';
import { DebrisAPI } from '../../services/debris-api';
import { useDebrisStore } from '../../stores/debris-store';
import { useUIStore } from '../../stores/ui-store';
import { convertTLEArrayToDebrisObjects } from '../../utils/tle-converter';
import { SearchResultsList } from './SearchResultsList';
import { TimeControls } from './TimeControls';
import './DebrisSearchPanel.css';

interface DebrisSearchPanelProps {
  onSearch: (query: string) => void;
  totalObjects: number;
  displayedObjects: number;
  className?: string;
}

export function DebrisSearchPanel({
  onSearch,
  totalObjects,
  displayedObjects,
  className = '',
}: DebrisSearchPanelProps) {
  const debris = useDebrisStore((state) => state.debris);
  const addDebrisObjects = useDebrisStore((state) => state.addDebrisObjects);
  const countryFilters = useDebrisStore((state) => state.countryFilters);
  const setCountryFilters = useDebrisStore((state) => state.setCountryFilters);
  const searchResults = useDebrisStore((state) => state.searchResults);
  const setSearchResults = useDebrisStore((state) => state.setSearchResults);
  const clearSearchResults = useDebrisStore((state) => state.clearSearchResults);
  const setSelectedDebrisId = useDebrisStore((state) => state.setSelectedDebrisId);
  const selectedDebrisId = useDebrisStore((state) => state.selectedDebrisId);
  const propagationMode = useUIStore((state) => state.propagationMode);
  const setPropagationMode = useUIStore((state) => state.setPropagationMode);
  const cesiumViewer = useUIStore((state) => state.cesiumViewer);

  const [searchQuery, setSearchQuery] = useState('');
  const [realTotalCount, setRealTotalCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showCountryFilters, setShowCountryFilters] = useState(false);
  const [totalSearchResults, setTotalSearchResults] = useState(0);
  const [searchOffset, setSearchOffset] = useState(0);
  const SEARCH_LIMIT = 10;

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
    // Clear search results and reset pagination when user starts typing a new search
    clearSearchResults();
    setTotalSearchResults(0);
    setSearchOffset(0);
    // Apply local filter immediately as user types
    onSearch(query);
  };

  const handleSearchClick = async () => {
    const query = searchQuery.trim();

    // If query is at least 3 characters, search Space-Track for matching objects
    if (query.length >= 3) {
      try {
        setIsSearching(true);
        clearSearchResults();
        setSearchOffset(0);
        const { data: results, total } = await DebrisAPI.searchByName(query, SEARCH_LIMIT, 0);
        setTotalSearchResults(total);

        if (results.length > 0) {
          // Convert TLE data to DebrisObject format
          const debrisObjects = convertTLEArrayToDebrisObjects(results);

          if (debrisObjects.length === 1 && total === 1) {
            // Single result: auto-add and select
            addDebrisObjects(debrisObjects);
            setSelectedDebrisId(debrisObjects[0].noradId);
            console.log(`Auto-selected: ${debrisObjects[0].name} (NORAD ${debrisObjects[0].noradId})`);
          } else {
            // Multiple results: show in list for user to choose
            setSearchResults(debrisObjects);
            setSearchOffset(SEARCH_LIMIT);
            console.log(`Found ${total} objects matching "${query}", showing first ${debrisObjects.length}`);
          }
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

  const handleLoadMore = async () => {
    const query = searchQuery.trim();
    if (query.length < 3) return;

    try {
      setIsLoadingMore(true);
      const { data: results } = await DebrisAPI.searchByName(query, SEARCH_LIMIT, searchOffset);

      if (results.length > 0) {
        const debrisObjects = convertTLEArrayToDebrisObjects(results);
        // Append to existing results
        setSearchResults([...searchResults, ...debrisObjects]);
        setSearchOffset(searchOffset + results.length);
        console.log(`Loaded ${results.length} more results`);
      }
    } catch (error) {
      console.error('Load more failed:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  const handleCountryToggle = (countryCode: string) => {
    if (countryFilters.includes(countryCode)) {
      // Remove from filter
      setCountryFilters(countryFilters.filter((c) => c !== countryCode));
    } else {
      // Add to filter
      setCountryFilters([...countryFilters, countryCode]);
    }
  };

  const handleClearCountryFilters = () => {
    setCountryFilters([]);
  };

  return (
    <div className={`debris-search-panel ${className}`}>
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

      {/* Country Filter */}
      <div className="country-filter-section">
        <div
          className="country-filter-header"
          onClick={() => setShowCountryFilters(!showCountryFilters)}
        >
          <span className="filter-title">
            Country/Organization Filter
            {countryFilters.length > 0 && (
              <span className="filter-active-count"> ({countryFilters.length} selected)</span>
            )}
          </span>
          <span className="expand-icon">{showCountryFilters ? '▲' : '▼'}</span>
        </div>

        {showCountryFilters && (
          <div className="country-filter-content">
            {countryFilters.length > 0 && (
              <button className="clear-filters-btn" onClick={handleClearCountryFilters}>
                Clear All
              </button>
            )}
            <div className="country-list">
              {availableCountries.map(({ code, count }) => (
                <label key={code} className="country-checkbox">
                  <input
                    type="checkbox"
                    checked={countryFilters.includes(code)}
                    onChange={() => handleCountryToggle(code)}
                  />
                  <span className="country-name">
                    {code} <span className="country-count">({count.toLocaleString()})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Propagation Mode Toggle */}
      <div className="propagation-mode-section">
        <div className="mode-header">
          <span className="mode-title">Propagation Mode</span>
          <button
            className="mode-info"
            onClick={() => {
              window.open(
                'https://github.com/angadhn/debris-simulator-claude-code/blob/main/docs/orbit-propagation.md',
                '_blank',
                'noopener,noreferrer'
              );
            }}
            aria-label="Propagation mode information"
            title="Learn about SGP4 and Kepler propagation methods"
          >
            ⓘ
          </button>
        </div>
        <div className="mode-toggle-container">
          <button
            className={`mode-toggle-btn ${propagationMode === 'sgp4' ? 'active' : ''}`}
            onClick={() => setPropagationMode('sgp4')}
            title="Accurate (slower)"
          >
            SGP4
          </button>
          <button
            className={`mode-toggle-btn ${propagationMode === 'kepler' ? 'active' : ''}`}
            onClick={() => setPropagationMode('kepler')}
            title="Fast (less accurate)"
          >
            Kepler
          </button>
        </div>
      </div>

      <div className="total-count">
        <div className="count-row">
          <span>
            <strong>ⓘ</strong> Space-Track.org tracks{' '}
            {isLoadingCount ? (
              <strong>loading...</strong>
            ) : realTotalCount !== null ? (
              <strong>{realTotalCount.toLocaleString()}</strong>
            ) : (
              <strong>~30,000</strong>
            )}{' '}
            <span className="active-label">
              "active"
              <button
                className="tooltip-icon"
                onClick={() => {
                  alert('"Active" objects are still in orbit (not decayed).\n\nIncludes: operational satellites, defunct satellites, debris, rocket bodies.\n\nTotal catalog: ~50,000+ objects (including ~20,000 decayed/historical objects no longer in orbit).');
                }}
                aria-label="Active objects information"
              >
                {' '}?
              </button>
            </span>{' '}
            objects.
          </span>
        </div>
      </div>

      {/* Search Results List */}
      <SearchResultsList
        hasMore={searchResults.length < totalSearchResults}
        onLoadMore={handleLoadMore}
        isLoadingMore={isLoadingMore}
      />

      {/* Embedded Time Controls - shown when a satellite is selected */}
      {selectedDebrisId && cesiumViewer && (
        <TimeControls viewer={cesiumViewer} embedded />
      )}
    </div>
  );
}
