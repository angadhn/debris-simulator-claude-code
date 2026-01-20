import { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import { useDebrisStore } from '../../stores/debris-store';
import './TimeControls.css';

interface TimeControlsProps {
  viewer: Cesium.Viewer | null;
  embedded?: boolean; // For inline positioning in search panel
}

const TIME_MULTIPLIERS = [60, 300, 600, 1800, 3600]; // 1 min, 5 min, 10 min, 30 min, 1 hour per second

export function TimeControls({ viewer, embedded = false }: TimeControlsProps) {
  const selectedDebrisId = useDebrisStore((state) => state.selectedDebrisId);
  const isAnimating = useDebrisStore((state) => state.isAnimating);
  const setIsAnimating = useDebrisStore((state) => state.setIsAnimating);
  const setAnimationSpeed = useDebrisStore((state) => state.setAnimationSpeed);
  const setSelectedDebrisId = useDebrisStore((state) => state.setSelectedDebrisId);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [multiplierIndex, setMultiplierIndex] = useState(0); // Start at 60x
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (!viewer) return;

    // Update current time display
    const interval = setInterval(() => {
      if (viewer.clock.shouldAnimate) {
        setCurrentTime(Cesium.JulianDate.toDate(viewer.clock.currentTime));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [viewer]);

  const handlePlayPause = () => {
    if (!selectedDebrisId) {
      console.warn('Please select a debris object first');
      return;
    }
    setIsAnimating(!isAnimating);
  };

  const handleSpeedCycle = () => {
    // Cycle to next speed (wrap around to start)
    const newIndex = (multiplierIndex + 1) % TIME_MULTIPLIERS.length;
    setMultiplierIndex(newIndex);
    setAnimationSpeed(TIME_MULTIPLIERS[newIndex]);
  };

  const handleReset = () => {
    if (!viewer) return;
    // Stop animation
    setIsAnimating(false);
    // Clear selection
    setSelectedDebrisId(null);
    // Reset time to now
    viewer.clock.currentTime = Cesium.JulianDate.now();
    viewer.clock.multiplier = 1;
    viewer.clock.shouldAnimate = false;
    setCurrentTime(new Date());
    setMultiplierIndex(0);
  };

  const formatTime = (date: Date) => {
    return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  };

  const formatSpeed = (multiplier: number) => {
    if (multiplier >= 3600) return `${multiplier / 3600}h/s`;
    if (multiplier >= 60) return `${multiplier / 60}m/s`;
    return `${multiplier}x`;
  };

  const currentMultiplier = TIME_MULTIPLIERS[multiplierIndex];

  // Hide if no debris selected
  if (!selectedDebrisId) {
    return null;
  }

  return (
    <div className={`time-controls ${embedded ? 'embedded' : ''}`}>
      <div className="time-display">
        <div className="current-time">{formatTime(currentTime)}</div>
        <div className="time-speed">
          {isAnimating ? `Animating: ${formatSpeed(currentMultiplier)}` : 'Animation Paused'}
          <button
            className="info-btn"
            onClick={() => setShowInfo(!showInfo)}
            title="About TLE and SGP4"
          >
            ⓘ
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="info-panel">
          <div className="info-content">
            <h4>How This Works</h4>
            <p>
              <strong>TLE (Two-Line Element Set):</strong> Orbital data from{' '}
              <a href="https://www.space-track.org" target="_blank" rel="noopener noreferrer">
                Space-Track.org
              </a>{' '}
              containing position, velocity, and decay information.
            </p>
            <p>
              <strong>SGP4 Algorithm:</strong> Mathematical model that predicts satellite positions
              from TLE data. Used for all satellites (LEO/MEO/GEO).
            </p>
            <p>
              <strong>Note:</strong> This shows <em>predicted</em> positions based on TLE data, not
              real-time telemetry. Accuracy decreases as TLE ages.
            </p>
            <div className="info-links">
              Learn more:
              <a
                href="https://en.wikipedia.org/wiki/Two-line_element_set"
                target="_blank"
                rel="noopener noreferrer"
              >
                TLE Format
              </a>
              {' • '}
              <a
                href="https://en.wikipedia.org/wiki/Simplified_perturbations_models"
                target="_blank"
                rel="noopener noreferrer"
              >
                SGP4 Model
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="control-buttons">
        <button
          className="control-btn reset"
          onClick={handleReset}
          title="Reset time and clear selection"
        >
          ⏹
        </button>

        <button
          className="control-btn play-pause"
          onClick={handlePlayPause}
          title={isAnimating ? 'Pause Animation' : 'Play Animation'}
        >
          {isAnimating ? '❚❚' : '▶'}
        </button>

        <button
          className="control-btn speed"
          onClick={handleSpeedCycle}
          title="Click to cycle speed"
        >
          {formatSpeed(currentMultiplier)}
        </button>
      </div>
    </div>
  );
}
