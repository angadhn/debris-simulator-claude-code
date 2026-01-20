import { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/ui-store';
import { useDebrisStore } from '../../stores/debris-store';
import { DebrisAPI } from '../../services/debris-api';
import { convertTLEArrayToDebrisObjects } from '../../utils/tle-converter';
import { SearchResultsList } from './SearchResultsList';
import { TimeControls } from './TimeControls';
import './CollapsibleSearchButton.css';

interface CollapsibleSearchButtonProps {
  onSearch: (query: string) => void;
}

export function CollapsibleSearchButton({ onSearch }: CollapsibleSearchButtonProps) {
  const searchExpanded = useUIStore((state) => state.searchExpanded);
  const setSearchExpanded = useUIStore((state) => state.setSearchExpanded);
  const cesiumViewer = useUIStore((state) => state.cesiumViewer);
  const addDebrisObjects = useDebrisStore((state) => state.addDebrisObjects);
  const setSelectedDebrisId = useDebrisStore((state) => state.setSelectedDebrisId);
  const selectedDebrisId = useDebrisStore((state) => state.selectedDebrisId);
  const setSearchResults = useDebrisStore((state) => state.setSearchResults);
  const searchResults = useDebrisStore((state) => state.searchResults);
  const clearSearchResults = useDebrisStore((state) => state.clearSearchResults);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggleExpand = () => {
    setSearchExpanded(!searchExpanded);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    // Clear search results when user starts typing a new search
    clearSearchResults();
    onSearch(query); // Local filter
  };

  const handleSearchClick = async () => {
    const query = searchQuery.trim();

    // If query is at least 3 characters, search Space-Track for matching objects
    if (query.length >= 3) {
      try {
        setIsSearching(true);
        clearSearchResults();
        const results = await DebrisAPI.searchByName(query, 10);

        if (results.length > 0) {
          // Convert TLE data to DebrisObject format
          const debrisObjects = convertTLEArrayToDebrisObjects(results);

          if (debrisObjects.length === 1) {
            // Single result: auto-add and select
            addDebrisObjects(debrisObjects);
            setSelectedDebrisId(debrisObjects[0].noradId);
            console.log(`Auto-selected: ${debrisObjects[0].name} (NORAD ${debrisObjects[0].noradId})`);
          } else {
            // Multiple results: show in list for user to choose
            setSearchResults(debrisObjects);
            console.log(`Found ${debrisObjects.length} objects matching "${query}"`);
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  // Auto-focus input when expanded
  useEffect(() => {
    if (searchExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchExpanded]);

  return (
    <div className={`collapsible-search-button ${searchExpanded ? 'expanded' : 'collapsed'}`}>
      {!searchExpanded ? (
        <button
          className="search-icon-button"
          onClick={handleToggleExpand}
          aria-label="Expand search"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </button>
      ) : (
        <div className="mobile-search-container">
          <div className="search-input-expanded">
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Search by name or NORAD ID..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyPress={handleKeyPress}
              disabled={isSearching}
            />
            <button
              className="search-action-button"
              onClick={handleSearchClick}
              disabled={isSearching || searchQuery.trim().length < 3}
              aria-label="Search Space-Track"
              title="Search Space-Track for this object"
            >
              {isSearching ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="search-spinner"
                >
                  <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                  <path d="M12 2 A10 10 0 0 1 22 12" opacity="0.75"></path>
                </svg>
              ) : (
                '→'
              )}
            </button>
            <button
              className="search-close-button"
              onClick={handleToggleExpand}
              aria-label="Close search"
            >
              ×
            </button>
          </div>

          {/* Dropdown for search results and time controls */}
          {(searchResults.length > 0 || selectedDebrisId) && (
            <div className="mobile-search-dropdown">
              <SearchResultsList />
              {selectedDebrisId && cesiumViewer && (
                <TimeControls viewer={cesiumViewer} embedded />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
