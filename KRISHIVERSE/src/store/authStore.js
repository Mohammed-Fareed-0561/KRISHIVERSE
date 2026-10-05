import { create } from "zustand";
import * as authService from "../services/api/authService";

export const useAuthStore = create((set, get) => ({
  user: authService.getUser(),
  token: authService.getToken(),
  // Convenience booleans consumed by components/guards
  isAuthenticated: !!authService.getToken(),
  isOnboardingRequired: !(authService.getUser()?.onboarded),
  loading: false,
  error: null,

  // ─── Actions ───────────────────────────────────────────────────────────────

  register: async (payload) => {
    set({ loading: true, error: null });
    try {
      const data = await authService.register(payload);
  set({ user: data.user, token: data.token, loading: false, isAuthenticated: !!data.token, isOnboardingRequired: !(data.user?.onboarded) });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  sendOtp: async (phone) => {
    set({ loading: true, error: null });
    try {
      await authService.sendOtp(phone);
  set({ loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  verifyOtp: async (phone, otp) => {
    set({ loading: true, error: null });
    try {
      const data = await authService.verifyOtp(phone, otp);
  set({ user: data.user, token: data.token, loading: false, isAuthenticated: !!data.token, isOnboardingRequired: !(data.user?.onboarded) });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  login: async (payload) => {
    // Legacy support or fallback
    set({ loading: true, error: null });
    try {
      const data = await authService.login(payload);
  set({ user: data.user, token: data.token, loading: false, isAuthenticated: !!data.token, isOnboardingRequired: !(data.user?.onboarded) });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  logout: () => {
    authService.logout();
    set({ user: null, token: null, error: null, isAuthenticated: false, isOnboardingRequired: true });
  },

  completeOnboarding: async (profileData) => {
    set({ loading: true, error: null });
    try {
  const updatedUser = await authService.completeOnboarding(profileData);
  set({ user: updatedUser, loading: false, isOnboardingRequired: !(updatedUser?.onboarded) });
      return updatedUser;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateProfile: async (profileData) => {
    set({ loading: true, error: null });
    try {
  const updatedUser = await authService.updateProfile(profileData);
  set({ user: updatedUser, loading: false, isOnboardingRequired: !(updatedUser?.onboarded) });
      return updatedUser;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),

  isLoggedIn: () => !!get().token,
}));
