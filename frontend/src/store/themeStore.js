import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Theme (light/dark) — applies `.dark` class on <html>, persisted. */
export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'light',
      toggle: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        applyTheme(next);
        set({ theme: next });
      },
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'aviora-theme',
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme || 'light');
      },
    },
  ),
);

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}
