import { describe, it, expect, vi, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { getDb } from "../db/indexedDb";
import { DB_STORES } from "../db/schemas";
import { enqueueSync, getPendingSyncEntries, flushSync } from "./syncService";

afterEach(async () => {
  vi.restoreAllMocks();
  const db = await getDb();
  await db.clear(DB_STORES.syncQueue);
});

describe("syncService", () => {
  it("queues an outbox entry with a revision", async () => {
    const entry = await enqueueSync({
      storeName: "diseaseDiagnoses",
      payload: { id: "d1", diagnosis: "Late Blight" },
    });

    expect(entry.id).toBeTruthy();
    expect(entry.status).toBe("pending");
    expect(entry.revision).toBe(1);
    expect(entry.operation).toBe("upsert");
  });

  it("lists pending entries oldest-first", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    await enqueueSync({ storeName: "x", payload: { id: "a" } });
    vi.setSystemTime(new Date("2026-01-01T00:00:01.000Z"));
    await enqueueSync({ storeName: "x", payload: { id: "b" } });
    vi.useRealTimers();

    const pending = await getPendingSyncEntries();
    expect(pending.map((p) => p.payload.id)).toEqual(["a", "b"]);
  });

  it("marks entries synced after a successful push", async () => {
    await enqueueSync({ storeName: "x", payload: { id: "a" } });

    const post = vi.fn().mockResolvedValue({ status: 200 });
    const result = await flushSync({ endpoint: "/advisory/sync", post });

    expect(post).toHaveBeenCalledTimes(1);
    expect(result.pushed).toBe(1);
    expect(await getPendingSyncEntries()).toEqual([]);
  });

  it("keeps entries pending when offline", async () => {
    await enqueueSync({ storeName: "x", payload: { id: "a" } });

    const post = vi.fn().mockRejectedValue({ isOffline: true, code: "NETWORK_ERROR" });
    const result = await flushSync({ endpoint: "/advisory/sync", post });

    expect(result.pushed).toBe(0);
    expect(result.offline).toBe(true);
    expect((await getPendingSyncEntries()).length).toBe(1);
  });
});