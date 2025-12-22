import { create } from 'zustand';
import type { ViewMode } from '../types/simulation';
import type { DebrisObject } from '../types/debris';

interface UIStore {
  viewMode: ViewMode;
  selectedDebris: DebrisObject | null;
  cesiumViewer: any | null;
  
  setViewMode: (mode: ViewMode) => void;
  setSelectedDebris: (debris: DebrisObject | null) => void;
  setCesiumViewer: (viewer: any) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'orbital',
  selectedDebris: null,
  cesiumViewer: null,
  
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedDebris: (debris) => set({ selectedDebris: debris }),
  setCesiumViewer: (viewer) => set({ cesiumViewer: viewer }),
}));