import { useMemo } from 'react';
import { useDebrisStore } from '../../stores/debris-store';
import './DebrisInfoPanel.css';

export function DebrisInfoPanel() {
  const debris = useDebrisStore((state) => state.debris);
  const selectedDebrisId = useDebrisStore((state) => state.selectedDebrisId);
  const setSelectedDebrisId = useDebrisStore((state) => state.setSelectedDebrisId);

  const selectedDebris = useMemo(() => {
    if (!selectedDebrisId) return null;
    return debris.find((d) => d.noradId === selectedDebrisId);
  }, [debris, selectedDebrisId]);

  if (!selectedDebris) return null;

  const handleClose = () => {
    setSelectedDebrisId(null);
  };

  return (
    <div className="debris-info-panel">
      <div className="info-header">
        <h3>{selectedDebris.name}</h3>
        <button className="close-btn" onClick={handleClose}>×</button>
      </div>

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
          <div className="tle-line">{selectedDebris.tle.line1}</div>
          <div className="tle-line">{selectedDebris.tle.line2}</div>
        </div>

        <div className="info-hint">
          Click elsewhere to deselect
        </div>
      </div>
    </div>
  );
}
