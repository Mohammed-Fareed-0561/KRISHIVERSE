/** Profile outbox → syncService routing: profile edits ride their own API. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { getDb } from "../db/indexedDb";
import { DB_STORES } from "../db/schemas";
import { enqueueSync, getPendingSyncEntries, flushSync, collapseProfileEntries } from "./syncService";
import { queueProfileEdit, pendingProfileEdits } from "../offline/profileOutbox";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("kv_user", JSON.stringify({ id: "u1", profileRevision: 4 }));
});

afterEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  const db = await getDb();
  await db.clear(DB_STORES.syncQueue);
});

describe("collapseProfileEntries", () => {
  it("merges edits from different steps into one payload with the freshest revision", () => {
    const collapsed = collapseProfileEntries([
      { payload: { id: "u1", baseRevision: 4, profile: { village: "Kovai" }, onboarding: { step: 3 } } },
      { payload: { id: "u1", baseRevision: 3, profile: { crops: ["Rice"] } } },
    ]);

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]).toEqual({
      baseRevision: 4,
      profile: { village: "Kovai", crops: ["Rice"] },
      onboarding: { step: 3 },
    });
  });

  it("keeps separate farmers apart", () => {
    const collapsed = collapseProfileEntries([
      { payload: { id: "a", baseRevision: 1, profile: { village: "A" } } },
      { payload: { id: "b", baseRevision: 1, profile: { village: "B" } } },
    ]);
    expect(collapsed).toHaveLength(2);
  });
});

describe("flushSync routing", () => {
  it("sends profile edits to /users/profile/sync and other stores to the advisory endpoint", async () => {
    await queueProfileEdit({ village: "Kovai" });
    await enqueueSync({ storeName: "diseaseDiagnoses", payload: { id: "d1" } });

    const post = vi.fn().mockResolvedValue({ status: 200 });
    const result = await flushSync({ post });

    const urls = post.mock.calls.map(([url]) => url);
    expect(urls).toContain("/users/profile/sync");
    expect(urls).toContain("/advisory/sync");

    const profileCall = post.mock.calls.find(([url]) => url === "/users/profile/sync");
    // `id` is dropped during the collapse: the endpoint authenticates the user,
    // and the server schema strips unknown keys anyway.
    expect(profileCall[1].batch).toEqual([
      { baseRevision: 4, profile: { village: "Kovai" } },
    ]);
    expect(result.pushed).toBe(2);
    expect(await getPendingSyncEntries()).toEqual([]);
  });

  it("keeps profile edits queued when the device is offline", async () => {
    await queueProfileEdit({ village: "Kovai" });

    const post = vi.fn().mockRejectedValue({ isOffline: true, code: "NETWORK_ERROR" });
    const result = await flushSync({ post });

    expect(result.offline).toBe(true);
    expect(result.pushed).toBe(0);
    expect(await pendingProfileEdits()).toHaveLength(1);
  });
});

describe("queueProfileEdit", () => {
  it("captures the server revision the device had last seen", async () => {
    await queueProfileEdit({ village: "Kovai" }, { onboarding: { step: 2 } });

    const [entry] = await getPendingSyncEntries();
    expect(entry.storeName).toBe(DB_STORES.farmers);
    expect(entry.payload).toEqual({
      id: "u1",
      baseRevision: 4,
      profile: { village: "Kovai" },
      onboarding: { step: 2 },
    });
  });

  it("falls back to revision 0 when there is no cached user", async () => {
    localStorage.removeItem("kv_user");
    await queueProfileEdit({ village: "Kovai" });
    const [entry] = await getPendingSyncEntries();
    expect(entry.payload.baseRevision).toBe(0);
  });
});
