import { useEffect, useMemo, useState } from "react";
import { useGeolocation } from "./useGeolocation";
import { useOffline } from "./useOffline";
import { getNearbyPlaces, distanceKm } from "../services/api/shopsService";

const ALL_CATEGORIES = [
  { id: "all", label: "All", emoji: "🗺️" },
  { id: "fertilizer", label: "Fertilizer", emoji: "🌱" },
  { id: "seeds", label: "Seeds", emoji: "🌾" },
  { id: "office", label: "Agri Office", emoji: "🏛️" },
  { id: "vet", label: "Vet", emoji: "🐄" },
  { id: "bank", label: "Bank", emoji: "🏦" },
  { id: "education", label: "KVK", emoji: "🎓" },
  { id: "equipment", label: "Equipment", emoji: "🔧" },
];

export { ALL_CATEGORIES };

export function useShops({ lat: propLat, lon: propLon } = {}) {
  const { isOnline } = useOffline();
  const geo = useGeolocation();

  const lat = propLat ?? (geo.status === "success" ? geo.lat : null);
  const lon = propLon ?? (geo.status === "success" ? geo.lon : null);

  const [state, setState] = useState({
    status: "idle",
    shops: [],
    error: null,
    source: null,
  });
  const [activeCategory, setCategory] = useState("all");

  useEffect(() => {
    // Wait until we have coords (geolocation resolves or prop provided)
    if (lat == null || lon == null) return;

    let cancelled = false;

    async function run() {
      setState((s) => ({ ...s, status: "loading", error: null }));
      try {
        const { places, fromCache } = await getNearbyPlaces({ lat, lon });
        if (cancelled) return;
        setState({
          status: "success",
          shops: places,
          error: null,
          source: fromCache ? "cache" : "network",
        });
      } catch (error) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          status: s.shops.length ? "success" : "error",
          error,
        }));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [lat, lon, isOnline]);

  // Filter + sort by distance
  const filtered = useMemo(() => {
    const list =
      activeCategory === "all"
        ? state.shops
        : state.shops.filter((s) => s.type === activeCategory);

    if (lat == null) return list;
    return [...list].sort(
      (a, b) =>
        distanceKm(lat, lon, a.lat, a.lon) - distanceKm(lat, lon, b.lat, b.lon),
    );
  }, [state.shops, activeCategory, lat, lon]);

  return {
    ...state,
    shops: filtered,
    allShops: state.shops,
    activeCategory,
    setCategory,
    categories: ALL_CATEGORIES,
    userLat: lat,
    userLon: lon,
    geoStatus: geo.status,
    geoRequest: geo.request,
  };
}
