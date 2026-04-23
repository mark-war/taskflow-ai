import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================
// Auth Store
// ============================================================
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      teams: [],

      setAuth: ({ user, token, refreshToken, team }) => {
        set({
          user,
          token,
          refreshToken,
          teams: user?.teams || (team ? [team] : []),
        });
      },

      setUser: (user) => set({ user, teams: user?.teams || get().teams }),

      logout: () =>
        set({ user: null, token: null, refreshToken: null, teams: [] }),

      activeTeam: () => {
        const { teams } = get();
        return teams?.[0] || null;
      },
    }),
    {
      name: "taskflow-auth",
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        refreshToken: s.refreshToken,
      }),
    },
  ),
);
