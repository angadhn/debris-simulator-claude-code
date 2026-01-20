import { useDebrisStore } from '../../stores/debris-store';
import type { DebrisObject } from '../../types/debris';
import './SearchResultsList.css';

interface SearchResultsListProps {
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function SearchResultsList({
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}: SearchResultsListProps) {
  const searchResults = useDebrisStore((state) => state.searchResults);
  const setSelectedDebrisId = useDebrisStore((state) => state.setSelectedDebrisId);
  const addDebrisObjects = useDebrisStore((state) => state.addDebrisObjects);
  const clearSearchResults = useDebrisStore((state) => state.clearSearchResults);
  const selectedDebrisId = useDebrisStore((state) => state.selectedDebrisId);

  if (searchResults.length === 0) {
    return null;
  }

  const handleResultClick = (result: DebrisObject) => {
    // Add to debris store so it can be rendered
    addDebrisObjects([result]);
    // Select it to pan camera and show orbit
    setSelectedDebrisId(result.noradId);
    // Clear search results after selection
    clearSearchResults();
  };

  const getTypeBadge = (objectType: string) => {
    const type = objectType.toUpperCase();
    if (type.includes('PAYLOAD')) {
      return { label: 'Payload', className: 'badge-payload' };
    } else if (type.includes('ROCKET') || type.includes('R/B')) {
      return { label: 'Rocket Body', className: 'badge-rocket' };
    } else if (type.includes('DEBRIS')) {
      return { label: 'Debris', className: 'badge-debris' };
    }
    return { label: 'Unknown', className: 'badge-unknown' };
  };

  return (
    <div className="search-results-list">
      <div className="results-header">
        <span className="results-count">
          {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
        </span>
        <button
          className="clear-results-btn"
          onClick={clearSearchResults}
          title="Clear search results"
        >
          Clear
        </button>
      </div>

      <div className="results-items">
        {searchResults.map((result) => {
          const badge = getTypeBadge(result.objectType);
          const isSelected = result.noradId === selectedDebrisId;

          return (
            <button
              key={result.noradId}
              className={`result-item ${isSelected ? 'selected' : ''}`}
              onClick={() => handleResultClick(result)}
            >
              <div className="result-main">
                <span className="result-name">{result.name}</span>
                <span className={`result-badge ${badge.className}`}>{badge.label}</span>
              </div>
              <div className="result-details">
                <span className="result-norad">NORAD: {result.noradId}</span>
                {result.countryCode && (
                  <span className="result-country">{result.countryCode}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {hasMore && (
        <button
          className="load-more-btn"
          onClick={onLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? 'Loading...' : 'Load more results'}
        </button>
      )}
    </div>
  );
}
