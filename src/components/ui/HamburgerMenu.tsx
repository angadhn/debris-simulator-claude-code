import { useEffect } from 'react';
import { useUIStore } from '../../stores/ui-store';
import { ViewSwitcher } from './ViewSwitcher';
import './HamburgerMenu.css';

export function HamburgerMenu() {
  const hamburgerMenuOpen = useUIStore((state) => state.hamburgerMenuOpen);
  const setHamburgerMenuOpen = useUIStore((state) => state.setHamburgerMenuOpen);
  const setFilterPanelOpen = useUIStore((state) => state.setFilterPanelOpen);

  const handleToggle = () => {
    setHamburgerMenuOpen(!hamburgerMenuOpen);
  };

  const handleClose = () => {
    setHamburgerMenuOpen(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Close filter panel when hamburger opens
  useEffect(() => {
    if (hamburgerMenuOpen) {
      setFilterPanelOpen(false);
    }
  }, [hamburgerMenuOpen, setFilterPanelOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && hamburgerMenuOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [hamburgerMenuOpen]);

  // Body scroll lock
  useEffect(() => {
    if (hamburgerMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [hamburgerMenuOpen]);

  return (
    <>
      <button
        className="hamburger-menu-button"
        onClick={handleToggle}
        aria-label="Toggle menu"
        aria-expanded={hamburgerMenuOpen}
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
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      {hamburgerMenuOpen && (
        <div className="hamburger-menu-overlay" onClick={handleOverlayClick}>
          <div className="hamburger-menu-drawer">
            <div className="hamburger-menu-header">
              <h3>Menu</h3>
              <button
                className="hamburger-menu-close-button"
                onClick={handleClose}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="hamburger-menu-content">
              <div className="menu-section">
                <div className="menu-section-title">View Mode</div>
                <ViewSwitcher />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
