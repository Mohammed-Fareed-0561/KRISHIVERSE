/** authStore — session lifecycle, derived onboarding flag, offline patching. */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/api/authService", () => ({
  getUser: vi.fn(() => null),
  getToken: vi.fn(() => null),
  isLoggedIn: vi.fn(() => false),
  register: vi.fn(),
  login: vi.fn(),
  fetchMe: vi.fn(),
  serverLogout: vi.fn(() => Promise.resolve()),
  clear: vi.fn(),
  saveLocalUser: vi.fn(),
  requestVerificationCode: vi.fn(),
  confirmVerificationCode: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  updateProfile: vi.fn(),
  saveOnboarding: vi.fn(),
}));
vi.mock("../services/telemetry/farmerEvents", () => ({
  captureAuthEvent: vi.fn(),
  captureOnboardingEvent: vi.fn(),
}));

import * as authService from "../services/api/authService";
import { useAuthStore } from "./authStore";

function resetStore() {
  useAuthStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isOnboardingRequired: false,
    loading: false,
    error: null,
  });
}

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

describe("authStore session lifecycle", () => {
  it("marks a fresh registration as needing onboarding", async () => {
    authService.register.mockResolvedValue({
      token: "jwt",
      user: { id: "u1", email: "f@x.com", onboarding: { step: 0 } },
    });

    await useAuthStore.getState().register({ email: "f@x.com" });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isOnboardingRequired).toBe(true);
    expect(state.loading).toBe(false);
  });

  it("releases the wizard once onboarding is complete", async () => {
    authService.login.mockResolvedValue({
      token: "jwt",
      user: { id: "u1", onboarding: { completedAt: "2026-01-01T00:00:00.000Z" } },
    });

    await useAuthStore.getState().login({ email: "f@x.com", password: "x" });

    expect(useAuthStore.getState().isOnboardingRequired).toBe(false);
  });

  it("honours legacy accounts that never re-ran the wizard", async () => {
    authService.login.mockResolvedValue({ token: "jwt", user: { id: "u1", onboarded: true } });
    await useAuthStore.getState().login({ email: "f@x.com", password: "x" });
    expect(useAuthStore.getState().isOnboardingRequired).toBe(false);
  });

  it("surfaces a failed login without authenticating", async () => {
    authService.login.mockRejectedValue(new Error("Invalid credentials"));

    await expect(useAuthStore.getState().login({ email: "f@x.com", password: "bad" })).rejects.toThrow();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe("Invalid credentials");
    expect(state.loading).toBe(false);
  });

  it("clears the session on logout even though the JWT is stateless", () => {
    useAuthStore.setState({ user: { id: "u1" }, token: "jwt", isAuthenticated: true });
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(authService.clear).toHaveBeenCalled();
    expect(authService.serverLogout).toHaveBeenCalled();
  });

  it("drops the session when the server reports 401 on refresh", async () => {
    authService.isLoggedIn.mockReturnValue(true);
    authService.fetchMe.mockRejectedValue({ status: 401 });

    await useAuthStore.getState().refreshUser();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(authService.clear).toHaveBeenCalled();
  });
});

describe("authStore offline profile patching", () => {
  it("merges an offline edit into the cached user", () => {
    useAuthStore.setState({ user: { id: "u1", village: "Old", profileRevision: 2 } });

    const next = useAuthStore.getState().patchUser({ village: "Kovai", crops: ["Rice"] });

    expect(next).toMatchObject({ id: "u1", village: "Kovai", profileRevision: 2 });
    expect(useAuthStore.getState().user).toMatchObject({ village: "Kovai", crops: ["Rice"] });
    expect(authService.saveLocalUser).toHaveBeenCalledWith(expect.objectContaining({ village: "Kovai" }));
  });

  it("keeps the wizard open until the server confirms completion", async () => {
    authService.saveOnboarding.mockResolvedValue({ id: "u1", onboarding: { step: 3 } });
    useAuthStore.setState({ isAuthenticated: true, isOnboardingRequired: true });

    await useAuthStore.getState().saveOnboarding({ step: 3 });

    expect(useAuthStore.getState().isOnboardingRequired).toBe(true);
  });
});
