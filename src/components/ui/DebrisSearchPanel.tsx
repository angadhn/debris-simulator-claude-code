import { useState, useEffect } from 'react';
import { DebrisAPI } from '../../services/debris-api';
import { useDebrisStore } from '../../stores/debris-store';
import { convertTLEArrayToDebrisObjects } from '../../utils/tle-converter';
import './DebrisSearchPanel.css';

interface DebrisSearchPanelProps {
  onSearch: (query: string) => void;
  totalObjects: number;
  displayedObjects: number;
}

export function DebrisSearchPanel({
  onSearch,
  totalObjects,
  displayedObjects,
}: DebrisSearchPanelProps) {
  const addDebrisObjects = useDebrisStore((state) => state.addDebrisObjects);

  const [searchQuery, setSearchQuery] = useState('');
  const [realTotalCount, setRealTotalCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

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
