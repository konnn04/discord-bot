import { create } from "zustand";
import { api } from "@/lib/api";
import { getStoredToken, storeToken, clearStoredToken } from "@/lib/auth";
import { TOKEN_DURATION_S } from "@/lib/config";
import { API_ROUTES } from "@/lib/routes";
import type { UserInfo } from "@/lib/types";

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  handleCallback: (token: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: () => {
    window.location.href = API_ROUTES.AUTH_LOGIN;
  },

  handleCallback: async (token: string) => {
    storeToken(token, TOKEN_DURATION_S);
    api.setToken(token);
    set({ token, isAuthenticated: true });
    try {
      const user = await api.get<UserInfo>(API_ROUTES.AUTH_ME);
      set({ user });
    } catch {
      // will fetch on next init
    }
  },

  logout: () => {
    clearStoredToken();
    api.setToken(null);
    set({ token: null, user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const user = await api.get<UserInfo>(API_ROUTES.AUTH_ME);
      set({ user, isLoading: false });
    } catch {
      get().logout();
      set({ isLoading: false });
    }
  },

  init: () => {
    const token = getStoredToken();
    if (token) {
      api.setToken(token);
      set({ token, isAuthenticated: true });
      get().fetchUser();
    } else {
      set({ isLoading: false });
    }
  },
}));
