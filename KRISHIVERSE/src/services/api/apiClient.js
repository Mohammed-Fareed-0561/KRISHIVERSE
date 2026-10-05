import axios from "axios";
import { appConfig } from "../config/appConfig";

// ─── Axios instance ───────────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: appConfig.apiBase,
  timeout: 12000,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor — attach JWT if present ──────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("kv_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor — normalise errors ──────────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    // Axios network error (offline, server down)
    if (!err.response) {
      const offline = new Error("Network unavailable — using offline data");
      offline.code = "NETWORK_ERROR";
      offline.isOffline = true;
      return Promise.reject(offline);
    }

    // 401 — token expired, clear it
    if (err.response.status === 401) {
      localStorage.removeItem("kv_token");
      localStorage.removeItem("kv_user");
    }

    // Unwrap backend error message
    const message =
      err.response.data?.message || err.message || "Request failed";
    const shaped = new Error(message);
    shaped.status = err.response.status;
    shaped.code = err.response.data?.code;
    return Promise.reject(shaped);
  },
);

// ─── Health check — used to detect backend availability ──────────────────────
export async function checkBackendHealth() {
  try {
    const { data } = await apiClient.get("/health", { timeout: 4000 });
    return data.status === "ok";
  } catch {
    return false;
  }
}
