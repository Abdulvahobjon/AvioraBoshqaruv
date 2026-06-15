import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Global auth state.
 * Faqat qisqa muddatli accessToken (15m) + user saqlanadi.
 * Refresh token endi httpOnly cookie'da (JS o'qiy olmaydi — XSS himoyasi).
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      user: null,

      setAuth: ({ accessToken, user }) =>
        set((s) => ({
          accessToken: accessToken ?? s.accessToken,
          user: user ?? s.user,
        })),

      setUser: (user) => set({ user }),

      logout: () => set({ accessToken: null, user: null }),
    }),
    { name: 'aviora-auth' },
  ),
);

// Non-React helpers for axios interceptors
export const getAuth = () => useAuthStore.getState();
