import { appConfig } from "../config/appConfig";
import { dbClear, dbGetAll, dbPut } from "../db/indexedDb";
import { DB_STORES } from "../db/schemas";

export async function getCachedSchemes() {
  const rows = await dbGetAll(DB_STORES.schemes);
  return rows ?? [];
}

export async function fetchSchemes() {
  const res = await fetch(appConfig.schemesDataUrl);
  if (!res.ok) {
    const err = new Error(`Schemes load failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const schemes = Array.isArray(data) ? data : [];

  await dbClear(DB_STORES.schemes);
  await Promise.all(
    schemes.map((s) =>
      dbPut(DB_STORES.schemes, {
        ...s,
        updatedAt: Date.now(),
      }),
    ),
  );

  return schemes;
}
