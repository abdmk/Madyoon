'use client';

import { create } from 'zustand';

/**
 * Client state is UI-only.
 *
 * Rows, filters and totals live on the server: lists are fetched per page with
 * their filters in the URL, so there is nothing here to keep in sync, hydrate
 * or invalidate.
 */
interface AppState {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
