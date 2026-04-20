import { create } from 'zustand';
import { API_URL } from '@/config/env';
import type { AuthUser } from '@/types';

const ADMIN_ROLES = ['admin', 'setter', 'tester'];

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (loginId: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginId, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Login failed');
    }

    const data = await res.json();

    if (!ADMIN_ROLES.includes(data.user.role)) {
      throw new Error('Access denied. Admin, setter, or tester role required.');
    }

    localStorage.setItem('admin_token', data.token);
    set({ user: data.user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* best-effort */ }
    }
    localStorage.removeItem('admin_token');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  restoreSession: async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const user: AuthUser = await res.json();
        if (ADMIN_ROLES.includes(user.role)) {
          set({ user, isAuthenticated: true, isLoading: false });
        } else {
          localStorage.removeItem('admin_token');
          set({ isLoading: false });
        }
      } else {
        localStorage.removeItem('admin_token');
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
