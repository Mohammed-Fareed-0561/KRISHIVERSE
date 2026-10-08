/** authService — session persistence, payload shape, and error propagation. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

import { apiClient } from "./apiClient";
import {
  register,
  login,
  fetchMe,
  updateProfile,
  saveOnboarding,
  syncProfileBatch,
  requestVerificationCode,
  getToken,
  getUser,
  clear,
  saveLocalUser,
} from "./authService";

const user = { id: "u1", email: "f@x.com", language: "ta", profileRevision: 3 };

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe("authService accounts", () => {
  it("forwards the register payload untouched (role is never set client-side)", async () => {
    const payload = { name: "Ravi", email: "f@x.com", password: "secret1", language: "ta", district: "Erode" };
    apiClient.post.mockResolvedValue({ data: { token: "jwt", user } });

    await register(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/auth/register", payload);
    expect(Object.keys(apiClient.post.mock.calls[0][1])).not.toContain("role");
    expect(getToken()).toBe("jwt");
    expect(getUser()).toMatchObject({ id: "u1", email: "f@x.com" });
  });

  it("keeps the session empty when login fails", async () => {
    apiClient.post.mockRejectedValue(Object.assign(new Error("Invalid credentials"), { status: 401 }));

    await expect(login({ email: "f@x.com", password: "nope" })).rejects.toThrow("Invalid credentials");
    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });

  it("stores the refreshed user from /auth/me", async () => {
    apiClient.get.mockResolvedValue({ data: { user } });
    await expect(fetchMe()).resolves.toEqual(user);
    expect(getUser()).toEqual(user);
  });
});

describe("authService profile", () => {
  it("persists the server copy of an updated profile", async () => {
    apiClient.put.mockResolvedValue({ data: { user: { ...user, profileRevision: 4, village: "Kovai" } } });

    await updateProfile({ village: "Kovai" });

    expect(apiClient.put).toHaveBeenCalledWith("/users/profile", { village: "Kovai" });
    expect(getUser()).toMatchObject({ village: "Kovai", profileRevision: 4 });
  });

  it("saves onboarding progress through the wizard endpoint", async () => {
    apiClient.put.mockResolvedValue({ data: { user } });
    await saveOnboarding({ step: 2, profile: { village: "Kovai" } });
    expect(apiClient.put).toHaveBeenCalledWith("/users/onboarding", { step: 2, profile: { village: "Kovai" } });
  });

  it("posts the outbox batch to the profile sync endpoint", async () => {
    const batch = [{ baseRevision: 3, profile: { village: "Kovai" } }];
    apiClient.post.mockResolvedValue({ data: { status: "ok", user, results: [{ status: "applied" }] } });

    const result = await syncProfileBatch(batch);

    expect(apiClient.post).toHaveBeenCalledWith("/users/profile/sync", { batch });
    expect(result.results).toEqual([{ status: "applied" }]);
    expect(getUser()).toEqual(user);
  });

  it("requests a verification code for an address", async () => {
    apiClient.post.mockResolvedValue({ data: { status: "sent", devCode: "123456" } });
    const data = await requestVerificationCode("f@x.com");
    expect(apiClient.post).toHaveBeenCalledWith("/auth/verify/request", { email: "f@x.com" });
    expect(data.status).toBe("sent");
  });
});

describe("authService local session", () => {
  it("writes the cached user given to it (the store does the merging)", () => {
    saveLocalUser(user);
    expect(getUser()).toEqual(user);
    saveLocalUser({ ...getUser(), village: "Kovai" });
    expect(getUser()).toMatchObject({ id: "u1", village: "Kovai" });
  });

  it("clears both keys on logout", () => {
    saveLocalUser(user);
    localStorage.setItem("kv_token", "jwt");
    clear();
    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });
});
