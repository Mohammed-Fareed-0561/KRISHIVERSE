import { dbGet, dbPut, dbGetAll } from "../db/indexedDb";
import { DB_STORES } from "../db/schemas";

// ─── Category map ─────────────────────────────────────────────────────────────



function classifyNode(el) {
  const t = el.tags ?? {};
  if (t.shop === "agrarian") return "fertilizer";
  if (t.shop === "garden_centre") return "seeds";
  if (t.amenity === "veterinary") return "vet";
  if (t.amenity === "bank") return "bank";
  if (t.office === "government" || t.office === "agricultural") return "office";
  if (t.amenity === "college" || t.amenity === "university") return "education";
  if (t.shop === "hardware") return "equipment";
  return "other";
}

function osmToPlace(el) {
  const t = el.tags ?? {};
  const name = t.name || t["name:en"] || t["name:ta"] || "Unknown Place";
  const street = [t["addr:housenumber"], t["addr:street"]]
    .filter(Boolean)
    .join(" ");
  const locality =
    t["addr:city"] ||
    t["addr:town"] ||
    t["addr:village"] ||
    t["addr:suburb"] ||
    "";
  const address =
    [street, locality].filter(Boolean).join(", ") || locality || "";

  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    type: classifyNode(el),
    lat: el.lat ?? el.center?.lat,
    lon: el.lon ?? el.center?.lon,
    address,
    phone: t.phone || t["contact:phone"] || null,
    website: t.website || t["contact:website"] || null,
    tags: t,
  };
}

// ─── Overpass query ───────────────────────────────────────────────────────────

function buildQuery(lat, lon, radiusM) {
  const r = radiusM;
  const around = `(around:${r},${lat},${lon})`;
  return `
[out:json][timeout:30];
(
  node["shop"="agrarian"]${around};
  node["shop"="garden_centre"]${around};
  node["shop"="hardware"]${around};
  node["amenity"="veterinary"]${around};
  node["amenity"="bank"]["name"~"cooperative|gramin|kisan|nabard",i]${around};
  node["office"="government"]${around};
  node["office"="agricultural"]${around};
  node["amenity"="college"]["name"~"agriculture|krishi|farm|kvk",i]${around};
  way["shop"="agrarian"]${around};
  way["office"="government"]${around};
  way["office"="agricultural"]${around};
);
out center body qt;
`.trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours
const CACHE_KEY = (lat, lon) =>
  `overpass:${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;

export async function getCachedShops(lat, lon) {
  if (lat == null) {
    // legacy: return all cached rows (original behaviour)
    return dbGetAll(DB_STORES.shops);
  }
  const record = await dbGet(DB_STORES.meta, CACHE_KEY(lat, lon));
  if (!record) return null;
  if (Date.now() - record.fetchedAt > CACHE_TTL) return null;
  return record.places;
}

export async function fetchNearbyPlaces({ lat, lon, radiusKm = 10 }) {
  const radiusM = radiusKm * 1000;
  const query = buildQuery(lat, lon, radiusM);

  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  let json = null;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      json = await res.json();
      break;
    } catch {
      // try next endpoint
    }
  }

  if (!json) throw new Error("Overpass API unreachable");

  const places = (json.elements ?? [])
    .map(osmToPlace)
    .filter((p) => p.lat != null && p.lon != null);

  // Cache in meta store
  await dbPut(DB_STORES.meta, {
    key: CACHE_KEY(lat, lon),
    fetchedAt: Date.now(),
    places,
  });

  // Also write to shops store for legacy reads
  await Promise.all(places.map((p) => dbPut(DB_STORES.shops, p)));

  return places;
}

/** Smart fetch — cache first, refresh if stale */
export async function getNearbyPlaces({ lat, lon, radiusKm = 10 }) {
  const cached = await getCachedShops(lat, lon);
  if (cached) return { places: cached, fromCache: true };
  const places = await fetchNearbyPlaces({ lat, lon, radiusKm });
  return { places, fromCache: false };
}

// ─── Haversine distance ───────────────────────────────────────────────────────

export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// legacy compat
export async function seedShopsIfEmpty() {
  return [];
}
