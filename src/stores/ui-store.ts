import { create } from 'zustand';
import type { ViewMode } from '../types/simulation';
import type { DebrisObject } from '../types/debris';

export type PropagationMode = 'sgp4' | 'kepler';
export type CameraMode = 'external' | 'firstPerson';

interface UIStore {
  viewMode: ViewMode;
  selectedDebris: DebrisObject | null;
  cesiumViewer: any | null;

  // Mobile UI states
  hamburgerMenuOpen: boolean;
  searchExpanded: boolean;
  filterPanelOpen: boolean;

  // Propagation mode (SGP4 = accurate, Kepler = fast)
  propagationMode: PropagationMode;

  // Camera mode (external = orbit view, firstPerson = on-satellite view)
  cameraMode: CameraMode;

  setViewMode: (mode: ViewMode) => void;
  setSelectedDebris: (debris: DebrisObject | null) => void;
  setCesiumViewer: (viewer: any) => void;
  setHamburgerMenuOpen: (open: boolean) => void;
  setSearchExpanded: (expanded: boolean) => void;
  setFilterPanelOpen: (open: boolean) => void;
  setPropagationMode: (mode: PropagationMode) => void;
  setCameraMode: (mode: CameraMode) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'orbital',
  selectedDebris: null,
  cesiumViewer: null,
  hamburgerMenuOpen: false,
  searchExpanded: false,
  filterPanelOpen: false,
  propagationMode: 'sgp4', // Default to accurate mode
  cameraMode: 'external', // Default to external view

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedDebris: (debris) => set({ selectedDebris: debris }),
  setCesiumViewer: (viewer) => set({ cesiumViewer: viewer }),
  setHamburgerMenuOpen: (open) => set({ hamburgerMenuOpen: open }),
  setSearchExpanded: (expanded) => set({ searchExpanded: expanded }),
  setFilterPanelOpen: (open) => set({ filterPanelOpen: open }),
  setPropagationMode: (mode) => set({ propagationMode: mode }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
}));