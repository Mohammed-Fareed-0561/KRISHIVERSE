import axios from "axios";
import { appConfig } from "../services/config/appConfig";

// Admin surface is mounted at /api/admin — separate from the farmer /api/v1 client
// so dashboard configuration can never leak into farmer runtime behaviour.
const apiRoot = appConfig.apiBase.replace(/\/v1\/?$/, "");
export const ADMIN_BASE = `${apiRoot}/admin`;
export const ADMIN_TOKEN_KEY = "kv_admin_token";

const client = axios.create({
  baseURL: ADMIN_BASE,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function shapeError(err) {
  if (!err.response) {
    const offline = new Error("Admin API unreachable — is the backend running?");
    offline.code = "NETWORK_ERROR";
    offline.status = 0;
    return offline;
  }
  const shaped = new Error(err.response.data?.message || err.message || "Admin request failed");
  shaped.status = err.response.status;
  shaped.code = err.response.data?.code;
  if (err.response.status === 401) clearAdminSession();
  return shaped;
}

export async function adminLogin(email, password) {
  try {
    const { data } = await axios.post(`${apiRoot}/v1/auth/login`, { email, password }, { timeout: 12000 });
    const role = data.user?.role;
    if (!role || role === "farmer") {
      const denied = new Error("This account does not have admin access.");
      denied.status = 403;
      denied.code = "forbidden";
      throw denied;
    }
    sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    sessionStorage.setItem("kv_admin_user", JSON.stringify({ id: data.user.id, email: data.user.email, role }));
    return { token: data.token, role, email: data.user.email };
  } catch (err) {
    throw err.status ? err : shapeError(err);
  }
}

export async function adminLogout() {
  try {
    await client.post("/auth/logout");
  } catch {
    /* logout is best effort — the token is dropped either way */
  }
  clearAdminSession();
}

function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem("kv_admin_user");
}

export function adminSession() {
  const raw = sessionStorage.getItem("kv_admin_user");
  if (!raw || !sessionStorage.getItem(ADMIN_TOKEN_KEY)) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function adminGet(path, params) {
  try {
    const { data } = await client.get(path, { params });
    return data;
  } catch (err) {
    throw shapeError(err);
  }
}

export async function adminPost(path, body) {
  try {
    const { data } = await client.post(path, body);
    return data;
  } catch (err) {
    throw shapeError(err);
  }
}

export async function adminPatch(path, body) {
  try {
    const { data } = await client.patch(path, body);
    return data;
  } catch (err) {
    throw shapeError(err);
  }
}

export function can(permissions, permission) {
  return Array.isArray(permissions) && permissions.includes(permission);
}
