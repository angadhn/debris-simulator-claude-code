import { useEffect, useState } from 'react';
import './WelcomeTutorial.css';

const STORAGE_KEY = 'debris-simulator-tutorial-seen';

interface WelcomeTutorialProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export function WelcomeTutorial({ forceShow = false, onClose }: WelcomeTutorialProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      return;
    }

    // Check if user has seen the tutorial before
    const hasSeenTutorial = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenTutorial) {
      // Show tutorial after a brief delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleClose = () => {
    setIsVisible(false);
    if (!forceShow) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    onClose?.();
  };

  const handleGetStarted = () => {
    handleClose();
  };

  if (!isVisible) return null;

  return (
    <div className="welcome-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="welcome-modal">
        <button className="welcome-close" onClick={handleClose} aria-label="Close tutorial">
          ×
        </button>

        <div className="welcome-header">
          <h2>Welcome to Space Debris Simulator</h2>
          <p className="welcome-subtitle">Real-time visualization of 25,000+ orbital objects</p>
        </div>

        <div className="welcome-steps">
          <div className="welcome-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Select an Object</h3>
              <p>Tap any satellite or debris to view its orbital path and information</p>
            </div>
          </div>

          <div className="welcome-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Control Time</h3>
              <p>Press the <strong>play button</strong> in the bottom toolbar to animate orbital motion</p>
            </div>
          </div>

          <div className="welcome-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Explore & Filter</h3>
              <p>
                Use the <strong>filter button</strong> to show/hide object types, filter by country,
                and switch between SGP4 and Kepler propagation modes
              </p>
            </div>
          </div>
        </div>

        <div className="welcome-footer">
          <button className="welcome-btn primary" onClick={handleGetStarted}>
            Get Started
          </button>
          <p className="welcome-tip">
            💡 Tip: Click the <strong>ⓘ</strong> button next to "Propagation Mode" to learn about
            the different orbital mechanics simulations
          </p>
        </div>
      </div>
    </div>
  );
}

export function useWelcomeTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  const openTutorial = () => setShowTutorial(true);
  const closeTutorial = () => setShowTutorial(false);

  return {
    showTutorial,
    openTutorial,
    closeTutorial,
  };
}
