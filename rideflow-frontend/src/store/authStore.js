import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,       // { userId, email, role, full_name, account_status }
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user) => set({ user, isAuthenticated: true }),
      clearAuth: () => set({ user: null, isAuthenticated: false }),
      setLoading: (val) => set({ isLoading: val }),
    }),
    {
      name: 'rideflow-auth',
      // Only persist user object — tokens live in httpOnly cookies (not here)
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;
