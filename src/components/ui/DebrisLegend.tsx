import { useState } from 'react';
import { useDebrisStore } from '../../stores/debris-store';
import './DebrisLegend.css';

interface DebrisLegendProps {
  objectCounts: {
    total: number;
    payload: number;
    rocketBody: number;
    debris: number;
    unknown: number;
  };
}

export function DebrisLegend({ objectCounts }: DebrisLegendProps) {
  const [collapsed, setCollapsed] = useState(false);
  const filters = useDebrisStore((state) => state.filters);
  const setFilters = useDebrisStore((state) => state.setFilters);

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters({
      ...filters,
      [key]: !filters[key],
    });
  };

  const visibleCount =
    (filters.showPayload ? objectCounts.payload : 0) +
    (filters.showRocketBody ? objectCounts.rocketBody : 0) +
    (filters.showDebris ? objectCounts.debris : 0) +
    (filters.showUnknown ? objectCounts.unknown : 0);

  return (
    <div className={`debris-legend ${collapsed ? 'collapsed' : ''}`}>
      <div className="legend-header" onClick={() => setCollapsed(!collapsed)}>
        <h3>Space Debris</h3>
        <button className="collapse-btn">{collapsed ? '▼' : '▲'}</button>
      </div>

      {!collapsed && (
        <div className="legend-content">
          <div className="object-count">
            <strong>{visibleCount.toLocaleString()}</strong> of{' '}
            <strong>{objectCounts.total.toLocaleString()}</strong> objects visible
          </div>

          <div className="legend-items">
            <div
              className={`legend-item ${!filters.showPayload ? 'disabled' : ''}`}
              onClick={() => toggleFilter('showPayload')}
            >
              <div className="color-box" style={{ backgroundColor: 'white' }}></div>
              <span className="label">Payload / Satellites</span>
              <span className="count">{objectCounts.payload.toLocaleString()}</span>
            </div>

            <div
              className={`legend-item ${!filters.showRocketBody ? 'disabled' : ''}`}
              onClick={() => toggleFilter('showRocketBody')}
            >
              <div className="color-box" style={{ backgroundColor: 'red' }}></div>
              <span className="label">Rocket Bodies</span>
              <span className="count">{objectCounts.rocketBody.toLocaleString()}</span>
            </div>

            <div
              className={`legend-item ${!filters.showDebris ? 'disabled' : ''}`}
              onClick={() => toggleFilter('showDebris')}
            >
              <div className="color-box" style={{ backgroundColor: 'gray' }}></div>
              <span className="label">Debris Fragments</span>
              <span className="count">{objectCounts.debris.toLocaleString()}</span>
            </div>

            {objectCounts.unknown > 0 && (
              <div
                className={`legend-item ${!filters.showUnknown ? 'disabled' : ''}`}
                onClick={() => toggleFilter('showUnknown')}
              >
                <div className="color-box" style={{ backgroundColor: 'yellow' }}></div>
                <span className="label">Unknown</span>
                <span className="count">{objectCounts.unknown.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="legend-hint">
            Click to show/hide object types
          </div>
        </div>
      )}
    </div>
  );
}
