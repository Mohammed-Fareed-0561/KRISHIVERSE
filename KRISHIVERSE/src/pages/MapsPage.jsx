import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import { useOffline } from "../hooks/useOffline";
import { vibrate } from "../utils/haptics";
import { useShops } from "../hooks/useShops";
import { useGeolocation } from "../hooks/useGeolocation";
import { distanceKm } from "../services/api/shopsService";
import {
  IconWifiOff,
  IconMapPin,
  IconPhone,
  IconRoute,
  IconX,
  IconCurrentLocation,
} from "@tabler/icons-react";

// ─── Fix Leaflet's broken default icon paths in bundled environments ──────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Custom icons ─────────────────────────────────────────────────────────────
const makeIcon = (emoji, bg = "#16a34a") =>
  L.divIcon({
    className: "",
    html: `<div style="
      background:${bg};
      width:36px;height:36px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid #fff;
    ">
      <span style="transform:rotate(45deg);font-size:16px;line-height:1;">${emoji}</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });

const USER_ICON = L.divIcon({
  className: "",
  html: `<div style="
    background:#2563eb;width:16px;height:16px;border-radius:50%;
    border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const TYPE_CONFIG = {
  mandi: { emoji: "🏪", bg: "#b45309", tabKey: "maps.tab.mandi" },
  fertilizer: { emoji: "🌱", bg: "#16a34a", tabKey: "maps.tab.fertilizer" },
  seeds: { emoji: "🌾", bg: "#15803d", tabKey: "maps.tab.seeds" },
  education: { emoji: "🏛️", bg: "#7c3aed", tabKey: "maps.tab.education" },
  soillab: { emoji: "🏥", bg: "#0891b2", tabKey: "maps.tab.soillab" },
  office: { emoji: "🏢", bg: "#0369a1", tabKey: "maps.tab.office" },
  bank: { emoji: "🏦", bg: "#b91c1c", tabKey: "maps.tab.bank" },
  equipment: { emoji: "🔧", bg: "#92400e", tabKey: "maps.tab.equipment" },
  other: { emoji: "📍", bg: "#6b7280", tabKey: "maps.tab.all" },
};

const TABS = [
  { id: "all", key: "maps.tab.all", emoji: "🗺️" },
  { id: "mandi", key: "maps.tab.mandi", emoji: "🏪" },
  { id: "fertilizer", key: "maps.tab.fertilizer", emoji: "🌱" },
  { id: "education", key: "maps.tab.education", emoji: "🏛️" },
  { id: "soillab", key: "maps.tab.soillab", emoji: "🏥" },
];

// ─── Default center (Chennai, TN) — only used while GPS is loading ───────────
const DEFAULT_CENTER = [13.0827, 80.2707];
const DEFAULT_ZOOM = 11;

// ─── Helper: fly map to coords ────────────────────────────────────────────────
function FlyTo({ lat, lon, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lon != null) map.flyTo([lat, lon], zoom ?? DEFAULT_ZOOM);
  }, [lat, lon, zoom, map]);
  return null;
}

// ─── Bottom sheet for selected marker ────────────────────────────────────────
function BottomSheet({ shop, onClose, userLat, userLon, t }) {
  if (!shop) return null;
  const cfg = TYPE_CONFIG[shop.type] ?? TYPE_CONFIG.other;
  const dist =
    userLat != null && shop.lat != null
      ? distanceKm(userLat, userLon, shop.lat, shop.lon).toFixed(1)
      : null;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lon}`;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-[9999] px-4 pointer-events-none">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 pointer-events-auto overflow-hidden max-w-lg mx-auto">
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pb-5 pt-2">
          {/* Name + type badge */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <span className="text-2xl flex-shrink-0 mt-0.5">{cfg.emoji}</span>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 text-base leading-tight">
                  {shop.name}
                </h3>
                {shop.address && (
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {shop.address}
                  </p>
                )}
                {dist && (
                  <span className="inline-flex items-center gap-1 mt-1 text-xs text-gray-400">
                    <IconMapPin size={11} />
                    {dist} km {t("maps.distance")}
                  </span>
                )}
              </div>
            </div>
            <button
              className="flex-shrink-0 p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
              onClick={onClose}
              aria-label="Close"
            >
              <IconX size={18} />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold active:bg-green-700"
            >
              <IconRoute size={16} />
              {t("maps.directions")}
            </a>
            {shop.phone && (
              <a
                href={`tel:${shop.phone}`}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold active:bg-blue-700"
              >
                <IconPhone size={16} />
                {t("maps.call")}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MapsPage() {
  const { t } = useTranslation();
  const { isOffline } = useOffline();
  const geo = useGeolocation();

  const userLat = geo.status === "success" ? geo.lat : null;
  const userLon = geo.status === "success" ? geo.lon : null;
  const mapCenter = userLat != null ? [userLat, userLon] : DEFAULT_CENTER;

  const { shops, status, source } = useShops({ lat: userLat, lon: userLon });

  // Also load static fallback for pure offline / no-data states
  const [staticShops, setStaticShops] = useState([]);
  useEffect(() => {
    fetch("/data/staticShops.json")
      .then((r) => r.json())
      .then((json) => setStaticShops(json.places ?? []))
      .catch(() => {});
  }, []);

  const [activeTab, setActiveTab] = useState("all");
  const [selectedShop, setSelectedShop] = useState(null);
  const [mapKey, setMapKey] = useState(0); // force remount on location change

  // Effective shops list: IDB/live data first, static fallback if empty
  const effectiveShops = shops.length > 0 ? shops : staticShops;

  // Filter by tab
  const visibleShops =
    activeTab === "all"
      ? effectiveShops
      : effectiveShops.filter((s) => s.type === activeTab);

  // When geolocation resolves, refresh map center
  useEffect(() => {
    if (geo.status === "success") setMapKey((k) => k + 1);
  }, [geo.status]);

  const handleMarkerClick = useCallback((shop) => setSelectedShop(shop), []);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] -mx-4 relative">
      {/* ── Offline banner ───────────────────────────────────────────────── */}
      {isOffline && (
        <div className="mx-4 mb-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 text-sm text-amber-700 flex-shrink-0">
          <IconWifiOff size={15} className="flex-shrink-0" />
          <span>{t("maps.offline")}</span>
        </div>
      )}

      {/* ── GPS status bar ───────────────────────────────────────────────── */}
      <div className="px-4 mb-2 flex-shrink-0">
        {geo.status === "loading" && (
          <div className="skeleton h-4 w-32 rounded-md" />
        )}
        {(geo.status === "denied" || geo.status === "error") && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-orange-600">
              {t("maps.gpsBlocked")}
            </span>
            <button
              onClick={geo.request}
              className="text-xs text-green-700 font-semibold underline"
            >
              {t("maps.getLocation")}
            </button>
          </div>
        )}
        {geo.status === "idle" && !userLat && (
          <p className="text-xs text-gray-400">{t("maps.noLocation")}</p>
        )}
        {geo.status === "success" && userLat && (
          <div className="flex items-center gap-1.5 text-xs text-green-700">
            <IconCurrentLocation size={12} />
            <span>
              {userLat.toFixed(4)}, {userLon.toFixed(4)}
            </span>
          </div>
        )}
      </div>

      {/* ── Category tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 flex-shrink-0 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              vibrate();
              setActiveTab(tab.id);
              setSelectedShop(null);
            }}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-green-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>{tab.emoji}</span>
            <span>{t(tab.key)}</span>
          </button>
        ))}
      </div>

      {/* ── Map area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <MapContainer
          key={mapKey}
          center={mapCenter}
          zoom={DEFAULT_ZOOM}
          className="w-full h-full"
          zoomControl={false}
          attributionControl={false}
        >
          {/* OSM tile layer — cached by service worker for offline */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Fly-to when GPS resolves */}
          {userLat != null && <FlyTo lat={userLat} lon={userLon} zoom={13} />}

          {/* User location marker */}
          {userLat != null && (
            <Marker position={[userLat, userLon]} icon={USER_ICON}>
              <Popup>📍 Your location</Popup>
            </Marker>
          )}

          {/* Shop markers */}
          {visibleShops.map((shop) => {
            if (shop.lat == null || shop.lon == null) return null;
            const cfg = TYPE_CONFIG[shop.type] ?? TYPE_CONFIG.other;
            const icon = makeIcon(cfg.emoji, cfg.bg);
            return (
              <Marker
                key={shop.id}
                position={[shop.lat, shop.lon]}
                icon={icon}
                eventHandlers={{ click: () => { vibrate(); handleMarkerClick(shop); } }}
              >
                <Popup>
                  <strong>{shop.name}</strong>
                  {shop.address && (
                    <>
                      <br />
                      <span className="text-xs text-gray-500">
                        {shop.address}
                      </span>
                    </>
                  )}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Loading overlay */}
        {status === "loading" && (
          <div className="absolute inset-0 z-[1000]">
            <div className="skeleton w-full h-full rounded-none" />
          </div>
        )}

        {/* No results message */}
        {visibleShops.length === 0 && status !== "loading" && (
          <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
            <div className="bg-white/90 rounded-2xl px-6 py-4 shadow text-center">
              <p className="text-sm text-gray-500">{t("maps.noResults")}</p>
            </div>
          </div>
        )}

        {/* Source badge */}
        <div className="absolute top-2 right-2 z-[1000]">
          {source === "cache" ||
          (shops.length === 0 && staticShops.length > 0) ? (
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
              📦 {isOffline ? "Cached" : "Saved"}
            </span>
          ) : source === "network" ? (
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
              🟢 Live
            </span>
          ) : null}
        </div>

        {/* Attribution (bottom-left) */}
        <div className="absolute bottom-1 left-1 z-[1000]">
          <span className="text-[9px] text-gray-400 bg-white/70 px-1 rounded">
            © OpenStreetMap
          </span>
        </div>
      </div>

      {/* ── Bottom sheet for selected marker ─────────────────────────────── */}
      {selectedShop && (
        <BottomSheet
          shop={selectedShop}
          onClose={() => setSelectedShop(null)}
          userLat={userLat}
          userLon={userLon}
          t={t}
        />
      )}
    </div>
  );
}
