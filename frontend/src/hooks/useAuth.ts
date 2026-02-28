import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mfaEnabled: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ requiresMFA: boolean; tempToken?: string }>;
  verifyMFA: (code: string, tempToken: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await axios.post(`${API_URL}/auth/login`, { email, password });
          const { accessToken, refreshToken, requiresMFA, tempToken, user } = response.data;

          if (requiresMFA) {
            set({ isLoading: false });
            return { requiresMFA: true, tempToken };
          }

          localStorage.setItem('refreshToken', refreshToken);
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
          return { requiresMFA: false };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verifyMFA: async (code, tempToken) => {
        set({ isLoading: true });
        try {
          const response = await axios.post(`${API_URL}/auth/mfa/authenticate`, { code, token: tempToken });
          const { accessToken, refreshToken, user } = response.data;
          localStorage.setItem('refreshToken', refreshToken);
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          await axios.post(`${API_URL}/auth/register`, data);
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      refreshToken: async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          get().logout();
          return;
        }
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('refreshToken', newRefreshToken);
          set({ accessToken });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      // storage is optional; it defaults to localStorage
      // If you want to be explicit, you can use:
      // storage: {
      //   getItem: (name) => localStorage.getItem(name),
      //   setItem: (name, value) => localStorage.setItem(name, value),
      //   removeItem: (name) => localStorage.removeItem(name),
      // },
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);