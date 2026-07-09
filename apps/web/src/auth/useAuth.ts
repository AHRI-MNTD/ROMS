import { create } from "zustand";

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setHydrating: (value: boolean) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem("roms-access-token"),
  // Start as false — only set to true after /auth/me confirms the session
  isAuthenticated: false,
  // True while the initial /auth/me check is in flight
  isHydrating: !!localStorage.getItem("roms-access-token"),

  login: (user, accessToken, refreshToken) => {
    localStorage.setItem("roms-access-token", accessToken);
    localStorage.setItem("roms-refresh-token", refreshToken);
    set({ user, accessToken, isAuthenticated: true, isHydrating: false });
  },

  logout: () => {
    localStorage.removeItem("roms-access-token");
    localStorage.removeItem("roms-refresh-token");
    set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false });
  },

  setHydrating: (value) => set({ isHydrating: value }),
}));
