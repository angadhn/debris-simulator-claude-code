import { create } from 'zustand';
import type { ViewMode } from '../types/simulation';
import type { DebrisObject } from '../types/debris';

interface UIStore {
  viewMode: ViewMode;
  selectedDebris: DebrisObject | null;
  cesiumViewer: any | null;

  // Mobile UI states
  hamburgerMenuOpen: boolean;
  searchExpanded: boolean;
  filterPanelOpen: boolean;

  setViewMode: (mode: ViewMode) => void;
  setSelectedDebris: (debris: DebrisObject | null) => void;
  setCesiumViewer: (viewer: any) => void;
  setHamburgerMenuOpen: (open: boolean) => void;
  setSearchExpanded: (expanded: boolean) => void;
  setFilterPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'orbital',
  selectedDebris: null,
  cesiumViewer: null,
  hamburgerMenuOpen: false,
  searchExpanded: false,
  filterPanelOpen: false,

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedDebris: (debris) => set({ selectedDebris: debris }),
  setCesiumViewer: (viewer) => set({ cesiumViewer: viewer }),
  setHamburgerMenuOpen: (open) => set({ hamburgerMenuOpen: open }),
  setSearchExpanded: (expanded) => set({ searchExpanded: expanded }),
  setFilterPanelOpen: (open) => set({ filterPanelOpen: open }),
}));