import { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import './TimeControls.css';

interface TimeControlsProps {
  viewer: Cesium.Viewer | null;
}

const TIME_MULTIPLIERS = [1, 10, 100, 1000, 10000];

export function TimeControls({ viewer }: TimeControlsProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [multiplierIndex, setMultiplierIndex] = useState(1); // Start at 10x
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    if (!viewer) return;

    // Set initial clock multiplier
    viewer.clock.multiplier = TIME_MULTIPLIERS[multiplierIndex];
    viewer.clock.shouldAnimate = isPlaying;

    // Update current time display
    const interval = setInterval(() => {
      if (viewer.clock.shouldAnimate) {
        setCurrentTime(Cesium.JulianDate.toDate(viewer.clock.currentTime));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [viewer, multiplierIndex, isPlaying]);

  const handlePlayPause = () => {
    if (!viewer) return;
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    viewer.clock.shouldAnimate = newIsPlaying;
  };

  const handleSpeedChange = (direction: 'slower' | 'faster') => {
    if (direction === 'faster' && multiplierIndex < TIME_MULTIPLIERS.length - 1) {
      const newIndex = multiplierIndex + 1;
      setMultiplierIndex(newIndex);
      if (viewer) {
        viewer.clock.multiplier = TIME_MULTIPLIERS[newIndex];
      }
    } else if (direction === 'slower' && multiplierIndex > 0) {
      const newIndex = multiplierIndex - 1;
      setMultiplierIndex(newIndex);
      if (viewer) {
        viewer.clock.multiplier = TIME_MULTIPLIERS[newIndex];
      }
    }
  };

  const handleReset = () => {
    if (!viewer) return;
    viewer.clock.currentTime = Cesium.JulianDate.now();
    setCurrentTime(new Date());
  };

  const formatTime = (date: Date) => {
    return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  };

  const currentMultiplier = TIME_MULTIPLIERS[multiplierIndex];

  return (
    <div className="time-controls">
      <div className="time-display">
        <div className="current-time">{formatTime(currentTime)}</div>
        <div className="time-speed">
          Speed: {currentMultiplier >= 1000 ? `${currentMultiplier / 1000}k` : currentMultiplier}x
        </div>
      </div>

      <div className="control-buttons">
        <button
          className="control-btn"
          onClick={() => handleSpeedChange('slower')}
          disabled={multiplierIndex === 0}
          title="Slower"
        >
          ◄◄
        </button>

        <button
          className="control-btn play-pause"
          onClick={handlePlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>

        <button
          className="control-btn"
          onClick={() => handleSpeedChange('faster')}
          disabled={multiplierIndex === TIME_MULTIPLIERS.length - 1}
          title="Faster"
        >
          ►►
        </button>

        <button
          className="control-btn reset"
          onClick={handleReset}
          title="Reset to current time"
        >
          ⟲
        </button>
      </div>
    </div>
  );
}
