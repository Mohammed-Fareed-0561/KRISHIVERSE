import { create } from "zustand";
import * as authService from "../services/api/authService";
import { captureAuthEvent } from "../services/telemetry/farmerEvents";

/**
 * Farmer session state.
 *
 * Derived flags:
 *  - isAuthenticated     a token is present (verified lazily via fetchMe)
 *  - isOnboardingRequired the signed-in farmer has not finished the 6-step
 *                         pilot setup; legacy accounts that set `onboarded`
 *                         before onboarding was versioned are still honoured.
 */
function deriveOnboarding(user) {
  if (!user) return false;
  if (user.onboarding?.completedAt) return false;
  // Accounts created before onboarding was versioned keep their old flag.
  return user.onboarded !== true;
}

function sessionFrom(data) {
  return {
    user: data.user,
    token: data.token,
    loading: false,
    error: null,
    isAuthenticated: Boolean(data.token),
    isOnboardingRequired: deriveOnboarding(data.user),
  };
}

export const useAuthStore = create((set, get) => ({
  user: authService.getUser(),
  token: authService.getToken(),
  isAuthenticated: Boolean(authService.getToken()),
  isOnboardingRequired: deriveOnboarding(authService.getUser()),
  loading: false,
  error: null,

  // ─── Accounts ──────────────────────────────────────────────────────────────

  register: async (payload) => {
    set({ loading: true, error: null });
    try {
      captureAuthEvent("auth.signup_started", { language: payload?.language, outcome: "success" });
      const data = await authService.register(payload);
      set(sessionFrom(data));
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  login: async (payload) => {
    set({ loading: true, error: null });
    try {
      const data = await authService.login(payload);
      set(sessionFrom(data));
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  /** Refresh the cached profile from the server (used on app resume). */
  refreshUser: async () => {
    if (!authService.isLoggedIn()) return null;
    try {
      const user = await authService.fetchMe();
      set({ user, isOnboardingRequired: deriveOnboarding(user) });
      return user;
    } catch (err) {
      if (err.status === 401) get().logout();
      return null;
    }
  },

  logout: () => {
    // Server record is fire-and-forget; the local session is cleared
    // synchronously so a farmer is signed out even while offline.
    authService.serverLogout();
    authService.clear();
    set({
      user: null,
      token: null,
      error: null,
      isAuthenticated: false,
      isOnboardingRequired: false,
      loading: false,
    });
  },

  // ─── Verification & recovery ───────────────────────────────────────────────

  requestVerification: async (email) => {
    set({ loading: true, error: null });
    try {
      captureAuthEvent("auth.verification_started");
      const data = await authService.requestVerificationCode(email);
      set({ loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  confirmVerification: async (email, code) => {
    set({ loading: true, error: null });
    try {
      const data = await authService.confirmVerificationCode(email, code);
      set({ user: data.user, loading: false, error: null });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  forgotPassword: async (email) => {
    set({ loading: true, error: null });
    try {
      captureAuthEvent("auth.reset_started");
      const data = await authService.forgotPassword(email);
      set({ loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  resetPassword: async (token, password) => {
    set({ loading: true, error: null });
    try {
      const data = await authService.resetPassword(token, password);
      set({ loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ─── Profile & onboarding ──────────────────────────────────────────────────

  updateProfile: async (profile) => {
    set({ loading: true, error: null });
    try {
      const user = await authService.updateProfile(profile);
      set({ user, loading: false, isOnboardingRequired: deriveOnboarding(user) });
      return user;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  saveOnboarding: async (payload) => {
    set({ loading: true, error: null });
    try {
      const user = await authService.saveOnboarding(payload);
      set({ user, loading: false, isOnboardingRequired: deriveOnboarding(user) });
      return user;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  /**
   * Apply an edit locally — used when the device is offline and the change has
   * been queued in the profile outbox instead of sent.
   */
  patchUser: (partial) => {
    const next = { ...(get().user || {}), ...(partial || {}) };
    authService.saveLocalUser(next);
    set({ user: next, isOnboardingRequired: deriveOnboarding(next) });
    return next;
  },

  clearError: () => set({ error: null }),
  isLoggedIn: () => Boolean(get().token),
}));
