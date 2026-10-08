import { apiClient } from "./apiClient";

/**
 * Farmer authentication + profile API.
 *
 * One auth system only: email + password with a stateless Bearer JWT.
 * The previous phone/OTP helpers were client-side mocks (they accepted the
 * literal "123456") and have been removed — verification now goes through the
 * real `POST /auth/verify/*` endpoints.
 *
 * Storage: localStorage `kv_token` / `kv_user` (admin keeps its own
 * sessionStorage keys and never shares this client).
 */

const TOKEN_KEY = "kv_token";
const USER_KEY = "kv_user";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(getToken());
}

function persist(token, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user || null));
  } catch {
    /* storage may be unavailable in private mode — session stays in memory */
  }
}

function storeUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user || null));
  } catch {
    /* ignore */
  }
}

/** Merge a locally applied change into the cached session user (offline edits). */
export function saveLocalUser(user) {
  storeUser(user);
  return user;
}

/** Drop the local session without touching the network. */
export function clear() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function register(payload) {
  const { data } = await apiClient.post("/auth/register", payload);
  persist(data.token, data.user);
  return data;
}

export async function login(payload) {
  const { data } = await apiClient.post("/auth/login", payload);
  persist(data.token, data.user);
  return data;
}

/** Refresh the cached user from the server (also works as a session probe). */
export async function fetchMe() {
  const { data } = await apiClient.get("/auth/me");
  storeUser(data.user);
  return data.user;
}

/**
 * Best-effort server-side logout record. The JWT itself is stateless and stays
 * valid until expiry, so the caller must always clear the local session too.
 */
export async function serverLogout() {
  try {
    await apiClient.post("/auth/logout");
  } catch {
    /* logging out must never fail because the network is down */
  }
}

// ─── Email verification ───────────────────────────────────────────────────────

export async function requestVerificationCode(email) {
  const { data } = await apiClient.post("/auth/verify/request", { email });
  return data;
}

export async function confirmVerificationCode(email, code) {
  const { data } = await apiClient.post("/auth/verify/confirm", { email, code });
  const user = { ...getUser(), emailVerified: true, emailVerifiedAt: data.emailVerifiedAt || new Date().toISOString() };
  storeUser(user);
  return { ...data, user };
}

// ─── Password recovery ────────────────────────────────────────────────────────

export async function forgotPassword(email) {
  const { data } = await apiClient.post("/auth/password/forgot", { email });
  return data;
}

export async function resetPassword(token, password) {
  const { data } = await apiClient.post("/auth/password/reset", { token, password });
  return data;
}

// ─── Profile & onboarding ─────────────────────────────────────────────────────

export async function getProfile() {
  const { data } = await apiClient.get("/users/profile");
  storeUser(data.user);
  return data.user;
}

export async function updateProfile(profile) {
  const { data } = await apiClient.put("/users/profile", profile);
  storeUser(data.user);
  return data.user;
}

export async function saveOnboarding(payload) {
  const { data } = await apiClient.put("/users/onboarding", payload);
  storeUser(data.user);
  return data.user;
}

/** Offline profile outbox flush — see services/offline/profileOutbox.js. */
export async function syncProfileBatch(batch) {
  const { data } = await apiClient.post("/users/profile/sync", { batch });
  if (data.user) storeUser(data.user);
  return data;
}
