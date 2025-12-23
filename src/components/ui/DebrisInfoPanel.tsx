import { useMemo, useState } from 'react';
import { useDebrisStore } from '../../stores/debris-store';
import './DebrisInfoPanel.css';

/**
 * Parse TLE epoch from TLE line 1
 * Format: YYDDD.DDDDDDDD (columns 19-32)
 */
function parseTLEEpoch(tleLine1: string): Date | null {
  try {
    // Extract epoch from columns 19-32 (0-indexed: 18-31)
    const epochStr = tleLine1.substring(18, 32).trim();

    // Parse year (YY format)
    const year2digit = parseInt(epochStr.substring(0, 2));
    const year = year2digit >= 57 ? 1900 + year2digit : 2000 + year2digit;

    // Parse day of year (fractional)
    const dayOfYear = parseFloat(epochStr.substring(2));

    // Create date from year and day of year
    const epochDate = new Date(Date.UTC(year, 0, 1));
    epochDate.setUTCDate(dayOfYear);

    return epochDate;
  } catch (error) {
    console.error('Failed to parse TLE epoch:', error);
    return null;
  }
}

/**
 * Calculate age of TLE in days
 */
function calculateTLEAge(epochDate: Date): number {
  const now = new Date();
  const ageMs = now.getTime() - epochDate.getTime();
  return Math.floor(ageMs / (1000 * 60 * 60 * 24));
}

export function DebrisInfoPanel() {
  const debris = useDebrisStore((state) => state.debris);
  const selectedDebrisId = useDebrisStore((state) => state.selectedDebrisId);
  const setSelectedDebrisId = useDebrisStore((state) => state.setSelectedDebrisId);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const selectedDebris = useMemo(() => {
    if (!selectedDebrisId) return null;
    return debris.find((d) => d.noradId === selectedDebrisId);
  }, [debris, selectedDebrisId]);

  const tleInfo = useMemo(() => {
    if (!selectedDebris) return null;

    const epochDate = parseTLEEpoch(selectedDebris.tle.line1);
    if (!epochDate) return null;

    const age = calculateTLEAge(epochDate);

    return {
      epochDate,
      age,
      formattedDate: epochDate.toISOString().split('T')[0],
    };
  }, [selectedDebris]);

  if (!selectedDebris) return null;

  const handleClose = () => {
    setSelectedDebrisId(null);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`debris-info-panel ${isCollapsed ? 'collapsed' : ''}`} onClick={isCollapsed ? toggleCollapse : undefined}>
      <div className="info-header">
        <h3>{selectedDebris.name}</h3>
        {isCollapsed && (
          <svg className="info-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        )}
        <div className="header-buttons">
          <button
            className="collapse-btn"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▲' : '▼'}
          </button>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="info-content">
          <div className="info-section">
            <h4>Identification</h4>
            <div className="info-row">
              <span className="label">NORAD ID:</span>
              <span className="value">{selectedDebris.noradId}</span>
            </div>
            <div className="info-row">
              <span className="label">Type:</span>
              <span className="value">{selectedDebris.objectType}</span>
            </div>
          </div>

          {(selectedDebris.inclination !== undefined ||
            selectedDebris.apogee !== undefined ||
            selectedDebris.perigee !== undefined ||
            selectedDebris.orbitPeriod !== undefined) && (
            <div className="info-section">
              <h4>Orbital Parameters</h4>
              {selectedDebris.inclination !== undefined && (
                <div className="info-row">
                  <span className="label">Inclination:</span>
                  <span className="value">{selectedDebris.inclination.toFixed(2)}°</span>
                </div>
              )}
              {selectedDebris.apogee !== undefined && (
                <div className="info-row">
                  <span className="label">Apogee:</span>
                  <span className="value">{selectedDebris.apogee.toFixed(0)} km</span>
                </div>
              )}
              {selectedDebris.perigee !== undefined && (
                <div className="info-row">
                  <span className="label">Perigee:</span>
                  <span className="value">{selectedDebris.perigee.toFixed(0)} km</span>
                </div>
              )}
              {selectedDebris.orbitPeriod !== undefined && (
                <div className="info-row">
                  <span className="label">Orbital Period:</span>
                  <span className="value">{(selectedDebris.orbitPeriod / 60).toFixed(1)} min</span>
                </div>
              )}
            </div>
          )}

          <div className="info-section">
            <h4>TLE Data</h4>
            {tleInfo && (
              <div className="info-row tle-epoch">
                <span className="label">TLE Epoch:</span>
                <span className="value">
                  {tleInfo.formattedDate}
                  <span className="tle-age">
                    {' '}({tleInfo.age === 0 ? 'today' : `${tleInfo.age} day${tleInfo.age > 1 ? 's' : ''} old`})
                  </span>
                </span>
              </div>
            )}
            <div className="tle-line">{selectedDebris.tle.line1}</div>
            <div className="tle-line">{selectedDebris.tle.line2}</div>
          </div>

          <div className="info-hint">
            Click elsewhere to deselect
          </div>
        </div>
      )}
    </div>
  );
}
