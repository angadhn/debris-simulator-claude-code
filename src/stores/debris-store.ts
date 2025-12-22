import { create } from 'zustand';
import type { DebrisObject } from '../types/debris';

interface DebrisFilters {
  showPayload: boolean;
  showRocketBody: boolean;
  showDebris: boolean;
  showUnknown: boolean;
}

interface OrbitFilters {
  leo: boolean;
  meo: boolean;
  geo: boolean;
}

interface SizeFilters {
  small: boolean;
  medium: boolean;
  large: boolean;
}

interface DebrisStore {
  debris: DebrisObject[];
  loading: boolean;
  error: string | null;
  selectedDebrisId: number | null;
  filters: DebrisFilters;
  orbitFilters: OrbitFilters;
  sizeFilters: SizeFilters;
  searchQuery: string;
  totalObjectsAvailable: number;

  setDebris: (debris: DebrisObject[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addDebrisObject: (debris: DebrisObject) => void;
  addDebrisObjects: (debris: DebrisObject[]) => void;
  setSelectedDebrisId: (id: number | null) => void;
  setFilters: (filters: DebrisFilters) => void;
  setOrbitFilters: (filters: OrbitFilters) => void;
  setSizeFilters: (filters: SizeFilters) => void;
  setSearchQuery: (query: string) => void;
  setTotalObjectsAvailable: (total: number) => void;
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
  orbitFilters: {
    leo: true,
    meo: true,
    geo: true,
  },
  sizeFilters: {
    small: true,
    medium: true,
    large: true,
  },
  searchQuery: '',
  totalObjectsAvailable: 0,

  setDebris: (debris) => set({ debris }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addDebrisObject: (newDebris) => set((state) => ({
    debris: [...state.debris, newDebris]
  })),
  addDebrisObjects: (newDebris) => set((state) => {
    // Filter out duplicates based on NORAD ID
    const existingIds = new Set(state.debris.map(d => d.noradId));
    const uniqueNewDebris = newDebris.filter(d => !existingIds.has(d.noradId));
    return { debris: [...state.debris, ...uniqueNewDebris] };
  }),
  setSelectedDebrisId: (id) => set({ selectedDebrisId: id }),
  setFilters: (filters) => set({ filters }),
  setOrbitFilters: (orbitFilters) => set({ orbitFilters }),
  setSizeFilters: (sizeFilters) => set({ sizeFilters }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTotalObjectsAvailable: (totalObjectsAvailable) => set({ totalObjectsAvailable }),
}));