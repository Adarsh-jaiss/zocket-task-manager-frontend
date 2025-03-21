import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { User } from '@/types/auth';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token: string, user: User) => {
        console.log('Setting auth state:', { token, user });
        // Set both cookie and localStorage
        Cookies.set('auth-token', token, { path: '/' });
        set({ token, user });
      },
      clearAuth: () => {
        console.log('Clearing auth state');
        // Clear both cookie and localStorage
        Cookies.remove('auth-token', { path: '/' });
        set({ token: null, user: null });
      },
      isAuthenticated: () => {
        const token = get().token || Cookies.get('auth-token');
        console.log('Checking auth state:', { token });
        return !!token;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => {
        return (persistedState) => {
          console.log('Rehydrated auth state:', persistedState);
          // Sync with cookie if state is empty but cookie exists
          if (!persistedState?.token) {
            const token = Cookies.get('auth-token');
            if (token) {
              // We need to use the store's set method here
              useAuthStore.setState({ token });
            }
          }
        };
      },
    }
  )
); 