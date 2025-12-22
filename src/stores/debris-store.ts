import { create } from 'zustand';
import type { DebrisObject } from '../types/debris';

interface DebrisFilters {
  showPayload: boolean;
  showRocketBody: boolean;
  showDebris: boolean;
  showUnknown: boolean;
}

interface DebrisStore {
  debris: DebrisObject[];
  loading: boolean;
  error: string | null;
  selectedDebrisId: number | null;
  filters: DebrisFilters;

  setDebris: (debris: DebrisObject[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addDebrisObject: (debris: DebrisObject) => void;
  setSelectedDebrisId: (id: number | null) => void;
  setFilters: (filters: DebrisFilters) => void;
}

export const useDebrisStore = create<DebrisStore>((set) => ({
  debris: [],
  loading: false,
  error: null,
  selectedDebrisId: null,
  filters: {
    showPayload: true,
    showRocketBody: true,
    showDebris: true,
    showUnknown: true,
  },

  setDebris: (debris) => set({ debris }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addDebrisObject: (newDebris) => set((state) => ({
    debris: [...state.debris, newDebris]
  })),
  setSelectedDebrisId: (id) => set({ selectedDebrisId: id }),
  setFilters: (filters) => set({ filters }),
}));