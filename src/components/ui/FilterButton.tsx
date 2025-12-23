import { useUIStore } from '../../stores/ui-store';
import './FilterButton.css';

export function FilterButton() {
  const filterPanelOpen = useUIStore((state) => state.filterPanelOpen);
  const setFilterPanelOpen = useUIStore((state) => state.setFilterPanelOpen);

  const handleClick = () => {
    setFilterPanelOpen(!filterPanelOpen);
  };

  return (
    <button
      className={`filter-button ${filterPanelOpen ? 'active' : ''}`}
      onClick={handleClick}
      aria-label="Toggle filters"
      aria-expanded={filterPanelOpen}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
      </svg>
    </button>
  );
}
