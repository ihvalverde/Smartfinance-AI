import { create } from 'zustand';
import api, { setAccessToken } from '../lib/api.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  initialized: false,
  bootstrapping: false,
  loading: false,

  setSession(payload) {
    setAccessToken(payload.accessToken);
    set({ user: payload.user, accessToken: payload.accessToken });
  },

  clearSession() {
    setAccessToken(null);
    set({ user: null, accessToken: null, initialized: true });
  },

  setUser(user) {
    set({ user });
  },

  async bootstrap() {
    if (get().initialized || get().bootstrapping) return;
    set({ bootstrapping: true });
    try {
      const response = await api.post('/auth/refresh');
      get().setSession(response.data.data);
    } catch {
      get().clearSession();
    } finally {
      set({ initialized: true, bootstrapping: false });
    }
  },

  async login(credentials) {
    set({ loading: true });
    try {
      const response = await api.post('/auth/login', credentials);
      get().setSession(response.data.data);
      set({ initialized: true });
      return response.data.data.user;
    } finally {
      set({ loading: false });
    }
  },

  async register(payload) {
    set({ loading: true });
    try {
      const response = await api.post('/auth/register', payload);
      get().setSession(response.data.data);
      set({ initialized: true });
      return response.data.data.user;
    } finally {
      set({ loading: false });
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // La sesión local se limpia igualmente.
    }
    get().clearSession();
  },

  async updateProfile(payload) {
    const response = await api.patch('/auth/me', payload);
    set({ user: response.data.data.user });
    return response.data.data.user;
  },
}));
