import { apiClient } from "./apiClient";

// ─── Token helpers ────────────────────────────────────────────────────────────
export function getToken() {
  return localStorage.getItem("kv_token");
}
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("kv_user") || "null");
  } catch {
    return null;
  }
}
export function isLoggedIn() {
  return !!getToken();
}

function persist(token, user) {
  localStorage.setItem("kv_token", token);
  localStorage.setItem("kv_user", JSON.stringify(user));
}

function clear() {
  localStorage.removeItem("kv_token");
  localStorage.removeItem("kv_user");
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Register a new farmer account.
 * @param {{ name, email, password, language?, location? }} payload
 */
export async function register(payload) {
  const { data } = await apiClient.post("/auth/register", payload);
  persist(data.token, data.user);
  return data;
}

/**
 * Login with email + password.
 * @param {{ email, password }} payload
 */
export async function login(payload) {
  const { data } = await apiClient.post("/auth/login", payload);
  persist(data.token, data.user);
  return data;
}

/**
 * Simulate sending OTP to mobile.
 */
export async function sendOtp(phone) {
  console.log(`[Mock] Sending OTP to ${phone}...`);
  await new Promise(r => setTimeout(r, 1000));
  return { success: true };
}

/**
 * Verify OTP and login.
 */
export async function verifyOtp(phone, otp) {
  await new Promise(r => setTimeout(r, 1000));
  if (otp === "123456") {
    const data = {
      token: "mock-jwt-token-" + Date.now(),
      user: {
        id: "u1",
        phone,
        name: "Mock Farmer",
        role: "farmer",
        isNew: true // Flag to trigger onboarding
      }
    };
    persist(data.token, data.user);
    return data;
  }
  throw new Error("Invalid OTP. Try 123456");
}

/**
 * Fetch current user profile from backend.
 */
export async function fetchMe() {
  const user = getUser();
  if (user) return user;
  throw new Error("Not logged in");
}

/**
 * Logout — clears local token and user.
 */
export function logout() {
  clear();
}

/**
 * Complete user onboarding.
 */
export async function completeOnboarding(profileData) {
  // Mock API call
  await new Promise(r => setTimeout(r, 800));
  const user = getUser();
  const updatedUser = { ...user, ...profileData, isNew: false };
  persist(getToken(), updatedUser);
  return updatedUser;
}

/**
 * Update user profile.
 */
export async function updateProfile(profileData) {
  const { data } = await apiClient.patch("/auth/profile", profileData);
  const currentToken = getToken();
  persist(currentToken, data.user);
  return data.user;
}
