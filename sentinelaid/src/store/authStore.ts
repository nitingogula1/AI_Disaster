import { create } from 'zustand';
import type { User, UserRole } from '../types';
import { authService } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const getInitialUser = (): User | null => {
  try {
    const raw = localStorage.getItem('sentinelaid_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialUser = getInitialUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  isAuthenticated: !!initialUser,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const { user } = await authService.login(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || 'Invalid credentials. Access denied.';
      set({ isLoading: false, error: msg });
      return false;
    }
  },

  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));

// Role-based access helper
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ['*'],
  DISASTER_OFFICER: ['dashboard', 'events', 'gis-map', 'satellite', 'drone-recon', 'ai-detection', 'damage', 'rescue-priority', 'routes', 'rescue-teams', 'reports', 'alerts', 'settings'],
  GIS_ANALYST: ['dashboard', 'events', 'gis-map', 'satellite', 'drone-recon', 'reports', 'settings'],
  AI_ANALYST: ['dashboard', 'events', 'satellite', 'drone-recon', 'ai-detection', 'damage', 'reports', 'settings'],
  RESCUE_TEAM: ['dashboard', 'events', 'drone-recon', 'rescue-priority', 'routes', 'rescue-teams', 'alerts', 'settings'],
};

export function hasAccess(role: UserRole, pageId: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.includes('*') || perms.includes(pageId);
}
