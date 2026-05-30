import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Global auth state (tokens + user). Persisted to localStorage. */
export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      setAuth: ({ accessToken, refreshToken, user }) =>
        set((s) => ({
          accessToken: accessToken ?? s.accessToken,
          refreshToken: refreshToken ?? s.refreshToken,
          user: user ?? s.user,
        })),

      setUser: (user) => set({ user }),

      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'aviora-auth' },
  ),
);

// Non-React helpers for axios interceptors
export const getAuth = () => useAuthStore.getState();
