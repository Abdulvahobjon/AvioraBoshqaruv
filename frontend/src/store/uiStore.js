import { create } from 'zustand';

/**
 * Transient layout/UI state (not persisted).
 * `sidebarCollapsed` is shared so a page can drive it — e.g. the Kanban board
 * collapses the sidebar, and expanding it switches the board back to the table view.
 */
export const useUiStore = create((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
