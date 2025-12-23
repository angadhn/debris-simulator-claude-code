import { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/ui-store';
import './CollapsibleSearchButton.css';

interface CollapsibleSearchButtonProps {
  onSearch: (query: string) => void;
}

export function CollapsibleSearchButton({ onSearch }: CollapsibleSearchButtonProps) {
  const searchExpanded = useUIStore((state) => state.searchExpanded);
  const setSearchExpanded = useUIStore((state) => state.setSearchExpanded);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggleExpand = () => {
    setSearchExpanded(!searchExpanded);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Optional: additional search action on Enter
      inputRef.current?.blur();
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
            width="20"
            height="20"
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
        <div className="search-input-expanded">
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search by name or NORAD ID..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyPress={handleKeyPress}
          />
          <button
            className="search-close-button"
            onClick={handleToggleExpand}
            aria-label="Close search"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
