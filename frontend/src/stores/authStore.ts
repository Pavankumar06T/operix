import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (user: User, token: string) => {
    localStorage.setItem('kaisenflow_token', token);
    localStorage.setItem('kaisenflow_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('kaisenflow_token');
    localStorage.removeItem('kaisenflow_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  initialize: () => {
    const token = localStorage.getItem('kaisenflow_token');
    const userStr = localStorage.getItem('kaisenflow_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true });
      } catch {
        localStorage.removeItem('kaisenflow_token');
        localStorage.removeItem('kaisenflow_user');
      }
    }
  },
}));
