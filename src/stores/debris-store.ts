import { create } from 'zustand';
import type { DebrisObject } from '../types/debris';

interface TypeSizeFilters {
  small: boolean;
  medium: boolean;
  large: boolean;
  unknown: boolean;
}

interface DebrisFilters {
  payload: {
    enabled: boolean;
    expanded: boolean;
    sizes: TypeSizeFilters;
  };
  rocketBody: {
    enabled: boolean;
    expanded: boolean;
    sizes: TypeSizeFilters;
  };
  debris: {
    enabled: boolean;
    expanded: boolean;
    sizes: TypeSizeFilters;
  };
  unknown: {
    enabled: boolean;
    expanded: boolean;
    sizes: TypeSizeFilters;
  };
}

interface OrbitFilters {
  leo: boolean;
  meo: boolean;
  geo: boolean;
}

interface DebrisStore {
  debris: DebrisObject[];
  loading: boolean;
  error: string | null;
  selectedDebrisId: number | null;
  filters: DebrisFilters;
  orbitFilters: OrbitFilters;
  countryFilters: string[]; // Array of selected country codes (empty = all)
  searchQuery: string;
  totalObjectsAvailable: number;
  isAnimating: boolean;
  animationSpeed: number; // Multiplier for time (1 = real-time, 60 = 1 min per second)

  setDebris: (debris: DebrisObject[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addDebrisObject: (debris: DebrisObject) => void;
  addDebrisObjects: (debris: DebrisObject[]) => void;
  setSelectedDebrisId: (id: number | null) => void;
  setFilters: (filters: DebrisFilters) => void;
  setOrbitFilters: (filters: OrbitFilters) => void;
  setCountryFilters: (filters: string[]) => void;
  setSearchQuery: (query: string) => void;
  setTotalObjectsAvailable: (total: number) => void;
  setIsAnimating: (isAnimating: boolean) => void;
  setAnimationSpeed: (speed: number) => void;
}

const createDefaultSizeFilters = (): TypeSizeFilters => ({
  small: true,
  medium: true,
  large: true,
  unknown: true,
});

export const useDebrisStore = create<DebrisStore>((set) => ({
  debris: [],
  loading: false,
  error: null,
  selectedDebrisId: null,
  filters: {
    payload: {
      enabled: true,
      expanded: false,
      sizes: createDefaultSizeFilters(),
    },
    rocketBody: {
      enabled: true,
      expanded: false,
      sizes: createDefaultSizeFilters(),
    },
    debris: {
      enabled: true,
      expanded: false,
      sizes: createDefaultSizeFilters(),
    },
    unknown: {
      enabled: true,
      expanded: false,
      sizes: createDefaultSizeFilters(),
    },
  },
  orbitFilters: {
    leo: true,
    meo: true,
    geo: true,
  },
  countryFilters: [], // Empty array = show all countries
  searchQuery: '',
  totalObjectsAvailable: 0,
  isAnimating: false,
  animationSpeed: 60, // Default: 1 minute per second

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
  setCountryFilters: (countryFilters) => set({ countryFilters }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTotalObjectsAvailable: (totalObjectsAvailable) => set({ totalObjectsAvailable }),
  setIsAnimating: (isAnimating) => set({ isAnimating }),
  setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),
}));