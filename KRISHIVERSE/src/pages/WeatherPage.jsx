import React, { useMemo, useEffect, useState } from "react";
import { useWeather } from "../hooks/useWeather";
import { useGeolocation } from "../hooks/useGeolocation";
import { useOffline } from "../hooks/useOffline";
import { appConfig } from "../services/config/appConfig";
import { dbGet, dbPut } from "../services/db/indexedDb";
import { DB_STORES } from "../services/db/schemas";
import {
  Drop,
  Wind,
  Eye,
  Thermometer,
  Cloud,
  ArrowsClockwise,
  MapPin,
  Target,
  WarningCircle,
  Check,
  Info,
  Leaf,
  Plant,
  CloudFog,
  TrendUp,
  CheckCircle,
  Circle
} from "@phosphor-icons/react";
import PullToRefresh from "../components/PullToRefresh";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEATHER_ICONS = {
  "01d": "☀️",
  "01n": "🌙",
  "02d": "⛅",
  "02n": "⛅",
  "03d": "☁️",
  "03n": "☁️",
  "04d": "☁️",
  "04n": "☁️",
  "09d": "🌧️",
  "09n": "🌧️",
  "10d": "🌦️",
  "10n": "🌦️",
  "11d": "⛈️",
  "11n": "⛈️",
  "13d": "❄️",
  "13n": "❄️",
  "50d": "🌫️",
  "50n": "🌫️",
};

function getEmoji(iconCode) {
  return WEATHER_ICONS[iconCode] ?? "🌤️";
}

function getBg(condition) {
  const key = String(condition || "").toLowerCase();
  if (key.includes("rain") || key.includes("drizzle")) return "linear-gradient(135deg, #2563eb 0%, #0f766e 100%)";
  if (key.includes("cloud")) return "linear-gradient(135deg, #64748b 0%, #175e3c 100%)";
  if (key.includes("thunder")) return "linear-gradient(135deg, #7f1d1d 0%, #334155 100%)";
  if (key.includes("clear")) return "linear-gradient(135deg, #16a34a 0%, #f59e0b 100%)";
  return "linear-gradient(135deg, var(--kv-green) 0%, #175e3c 100%)";
}

function fmt(n, unit = "") {
  return typeof n === "number" ? `${Math.round(n)}${unit}` : "—";
}

function groupByDay(list = []) {
  const days = {};
  for (const item of list) {
    const date = new Date(item.dt * 1000);
    const key = date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    if (!days[key]) {
      days[key] = {
        label: key,
        items: [],
        icon: item.weather?.[0]?.icon,
        desc: item.weather?.[0]?.main,
      };
    }
    days[key].items.push(item);
  }
  return Object.values(days)
    .slice(0, 5)
    .map((d) => {
      const temps = d.items.map((i) => i.main?.temp).filter(Boolean);
      const maxTemp = temps.length ? Math.max(...temps) : null;
      const minTemp = temps.length ? Math.min(...temps) : null;
      const midItem = d.items[Math.floor(d.items.length / 2)];
      return {
        label: d.label,
        icon: midItem?.weather?.[0]?.icon ?? d.icon,
        desc: midItem?.weather?.[0]?.main ?? d.desc,
        maxTemp,
        minTemp,
      };
    });
}

function getHourlySlots(list = []) {
  const now = Date.now() / 1000;
  return list.filter((i) => i.dt > now).slice(0, 8);
}

function getFarmReadiness({ condition, humidity, wind, temp }) {
  if (condition === "Thunderstorm") {
    return { label: "Unsafe for field work", tone: "danger", detail: "Secure tools, livestock, and electrical pump sets first." };
  }
  if (wind > 6) {
    return { label: "Avoid spraying", tone: "warning", detail: "Wind drift can waste pesticide and harm nearby crops." };
  }
  if (condition === "Rain" || condition === "Drizzle") {
    return { label: "Rain support active", tone: "info", detail: "Use this window to check drainage and pause irrigation." };
  }
  if (temp > 35) {
    return { label: "Heat stress risk", tone: "warning", detail: "Irrigate early morning or evening to reduce evaporation." };
  }
  if (humidity > 82) {
    return { label: "Disease watch", tone: "warning", detail: "High humidity can increase fungal pressure. Inspect leaves." };
  }
  return { label: "Good work window", tone: "success", detail: "Suitable for inspection, weeding, and light maintenance." };
}

function toneClasses(tone) {
  const map = {
    danger: "bg-[var(--kv-red-light)] text-[var(--kv-red)] border-[var(--kv-red)]",
    warning: "bg-[var(--kv-amber-light)] text-[var(--kv-amber)] border-[var(--kv-amber)]",
    info: "bg-[var(--kv-blue-light)] text-[var(--kv-blue)] border-[var(--kv-blue)]",
    success: "bg-[var(--kv-green-light)] text-[var(--kv-green)] border-[var(--kv-green)]",
  };
  return map[tone] || map.success;
}

function ForecastSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden -mx-4 px-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="kv-skeleton h-28 min-w-[72px] rounded-[16px]" />
      ))}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBadge({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-white/10 rounded-[12px] p-2.5 flex-1 min-w-[60px]">
      <span className="text-white opacity-80">{icon}</span>
      <span className="text-white font-bold text-[14px] leading-tight">
        {value}
      </span>
      <span className="text-white/70 text-[10px] text-center font-medium">{label}</span>
    </div>
  );
}

function DayCard({ day }) {
  const emoji = getEmoji(day.icon);
  return (
    <div className="flex-shrink-0 w-24 flex flex-col items-center gap-2 kv-card py-4 font-medium border border-[var(--kv-divider)] shadow-none">
      <span className="text-[12px] text-[var(--kv-near-black)] text-center leading-tight">
        {day.label}
      </span>
      <span className="text-3xl drop-shadow-sm">{emoji}</span>
      <span className="text-[11px] text-[var(--kv-grey-mid)] text-center">
        {day.desc ?? "—"}
      </span>
      <div className="flex gap-1.5 items-center mt-1">
        <span className="text-[14px] font-bold text-[var(--kv-near-black)]">{fmt(day.maxTemp, "°")}</span>
        <span className="text-[12px] text-[var(--kv-grey-mid)]">
          {fmt(day.minTemp, "°")}
        </span>
      </div>
    </div>
  );
}

function HourSlot({ item }) {
  const date = new Date(item.dt * 1000);
  const hour = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    hour12: true,
  });
  const emoji = getEmoji(item.weather?.[0]?.icon);
  const temp = fmt(item.main?.temp, "°");
  const rain = item.pop ? `${Math.round(item.pop * 100)}%` : null;

  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-1 bg-[var(--kv-off-white)] rounded-[16px] px-3 py-3 min-w-[64px] border border-[var(--kv-divider)]">
      <span className="text-[11px] text-[var(--kv-grey-dark)] font-medium mb-1">{hour.replace(' AM','am').replace(' PM','pm')}</span>
      <span className="text-2xl drop-shadow-sm">{emoji}</span>
      <span className="text-[14px] font-bold text-[var(--kv-near-black)] mt-1">{temp}</span>
      {rain && <span className="text-[10px] text-[var(--kv-blue)] font-bold mt-1">{rain} 🌧</span>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WeatherPage() {
  const { isOffline } = useOffline();
  const geo = useGeolocation();
  const [myCrops, setMyCrops] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [completedActions, setCompletedActions] = useState([]);

  // Request geolocation permission on mount
  useEffect(() => {
    if (geo.status === "idle") {
      geo.request();
    }
  }, []);

  useEffect(() => {
    async function loadChecked() {
      const checked = await dbGet(DB_STORES.meta, "weather_checklist_done");
      if (checked) setCompletedActions(checked.value || []);
    }
    loadChecked();
  }, []);

  const toggleAction = async (id) => {
    const next = completedActions.includes(id) 
      ? completedActions.filter(x => x !== id)
      : [...completedActions, id];
    setCompletedActions(next);
    await dbPut(DB_STORES.meta, { key: "weather_checklist_done", value: next });
  };

  useEffect(() => {
    async function loadUserData() {
      try {
        const crops = await dbGet(DB_STORES.meta, "my_crops");
        if (crops) setMyCrops(crops);
        
        const schedule = await dbGet(DB_STORES.meta, "crop_schedule");
        if (schedule) setCalendarEvents(schedule);
      } catch (err) {
        console.error("Failed to load crop metadata", err);
      }
    }
    loadUserData();
  }, []);

  const lat = geo.status === "success" ? geo.lat : appConfig.defaultLat;
  const lon = geo.status === "success" ? geo.lon : appConfig.defaultLon;

  const { status, record, forecast, forecastSource, error, source, refreshing, refetch } =
    useWeather({ lat, lon });

  const city = record?.data?.name;
  const temp = record?.data?.main?.temp;
  const feelsLike = record?.data?.main?.feels_like;
  const humidity = record?.data?.main?.humidity;
  const wind = record?.data?.wind?.speed;
  const visibility = record?.data?.visibility;
  const condition = record?.data?.weather?.[0]?.main;
  const iconCode = record?.data?.weather?.[0]?.icon;
  const desc = record?.data?.weather?.[0]?.description;

  const emoji = getEmoji(iconCode);
  const isStale = source === "cache";
  const readiness = getFarmReadiness({ condition, humidity, wind, temp });

  const list = useMemo(() => {
    const raw = forecast?.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw; // direct list
    if (Array.isArray(raw?.list)) return raw.list; // { list, city, ... }
    return [];
  }, [forecast]);

  const days = useMemo(() => groupByDay(list), [list]);
  const hourly = useMemo(() => getHourlySlots(list), [list]);

  const updatedAt = record?.fetchedAt
    ? new Date(record.fetchedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="flex flex-col gap-6 pt-2 pb-6">
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <h1 className="text-[26px] font-black font-[var(--font-heading)] text-[var(--kv-near-black)] leading-tight">Weather</h1>
          <p className="text-[13px] text-[var(--kv-grey-mid)] font-medium mt-1">Live forecast, farm safety, and irrigation guidance</p>
        </div>
        <button
          type="button"
          onClick={refetch}
          disabled={refreshing}
          className="h-11 px-4 rounded-2xl bg-[var(--kv-green)] text-white font-bold text-[12px] flex items-center gap-2 shadow-sm disabled:opacity-60"
          aria-label="Refresh weather"
        >
          <ArrowsClockwise size={16} weight="bold" className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Updating" : "Refresh"}
        </button>
      </div>
        
      {/* Location detecting handling */}
      <div className="flex flex-col gap-2">
        {geo.status === "loading" && (
          <div className="kv-skeleton h-10 w-full rounded-xl" />
        )}

        {(geo.status === "denied" || geo.status === "error") && (
          <div className="flex items-start justify-between gap-3 bg-[var(--kv-red-light)] border border-[var(--kv-red)] border-opacity-30 rounded-xl px-4 py-3 text-[13px]">
            <div className="flex items-start gap-2">
              <MapPin size={18} className="text-[var(--kv-red)] flex-shrink-0 mt-0.5" weight="fill" />
              <div>
                <p className="font-semibold text-[var(--kv-red)]">
                  {geo.status === "denied"
                    ? "Location permission denied"
                    : "Could not detect location"}
                </p>
                <p className="text-[var(--kv-red)] opacity-80 text-[11px] mt-1">
                  Showing default location near Coimbatore
                </p>
              </div>
            </div>
            <button className="text-[12px] font-bold text-[var(--kv-red)] bg-white px-3 py-1.5 rounded-lg ml-2" onClick={geo.request}>Retry</button>
          </div>
        )}

        {geo.status === "success" && (
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--kv-grey-mid)] font-medium px-1">
            <Target size={14} className="text-[var(--kv-green)]" weight="bold" />
            <span>Using current location</span>
          </div>
        )}
      </div>

      {/* ── Current Conditions Hero ─────────────────────────────────────────── */}
      {status === "loading" && !record ? (
        <div className="kv-skeleton h-56 w-full rounded-[24px]" />
      ) : status === "error" && !record ? (
        <div className="rounded-[24px] bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 p-6 flex flex-col items-center justify-center gap-4" style={{minHeight: '224px'}}>
          <WarningCircle size={48} weight="fill" className="text-red-500" />
          <div className="text-center">
            <h3 className="text-[18px] font-bold text-red-700 mb-2">Weather Data Unavailable</h3>
            <p className="text-[13px] text-red-600 mb-4 max-w-[280px]">
              {error?.message || error || "Unable to fetch weather data. Please check your internet connection and try again."}
            </p>
            <button
              onClick={refetch}
              className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold text-[13px] hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <ArrowsClockwise size={16} weight="bold" />
              Try Again
            </button>
          </div>
        </div>
      ) : record ? (
        <div
          className="rounded-[24px] text-white overflow-hidden shadow-sm relative p-5 px-6"
          style={{ background: getBg(condition), boxShadow: '0 8px 32px rgba(46, 125, 82, 0.15)' }}
        >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-[22px] font-black font-[var(--font-heading)] leading-tight flex items-center gap-1.5 drop-shadow-sm">
                  {city ?? "Your Location"}
                </h2>
                <p className="text-[13px] text-white/80 font-medium capitalize mt-1.5">
                  {desc}
                </p>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                {refreshing && (
                  <span className="text-[10px] bg-white/20 rounded-full px-2.5 py-1 flex items-center gap-1 font-bold shadow-sm backdrop-blur-sm">
                    <ArrowsClockwise size={10} weight="bold" className="animate-spin" /> UPDATING
                  </span>
                )}
                {isStale && (
                  <span className="text-[10px] bg-white/20 rounded-full px-2.5 py-1 flex items-center gap-1 font-bold shadow-sm backdrop-blur-sm">
                    <ArrowsClockwise size={10} weight="bold" /> CACHED
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 mb-6">
               <div className="flex flex-col">
                <span className="text-[56px] font-black font-[var(--font-heading)] leading-none drop-shadow-md">
                  {fmt(temp)}
                </span>
              </div>
              <span className="text-[64px] drop-shadow-xl saturate-150">{emoji}</span>
            </div>

            {/* Stats row */}
            <div className="flex gap-2">
              <StatBadge
                icon={<Drop size={16} weight="fill" />}
                label="Humidity"
                value={fmt(humidity, "%")}
              />
              <StatBadge
                icon={<Wind size={16} weight="fill" />}
                label="Wind"
                value={`${fmt(wind)}m/s`}
              />
              <StatBadge
                icon={<Eye size={16} weight="fill" />}
                label="Visibility"
                value={ visibility ? `${(visibility / 1000).toFixed(0)}km` : "—" }
              />
              <StatBadge
                icon={<Thermometer size={16} weight="fill" />}
                label="Feels Like"
                value={fmt(feelsLike, "°")}
              />
            </div>
            <div className="mt-4 rounded-2xl bg-white/15 border border-white/20 p-3 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <Leaf size={22} weight="fill" className="text-white mt-0.5" />
                <div>
                  <p className="text-[14px] font-black leading-tight">{readiness.label}</p>
                  <p className="text-[12px] text-white/80 font-medium mt-1 leading-relaxed">{readiness.detail}</p>
                </div>
              </div>
            </div>
        </div>
      ) : null}

      {/* Error state */}
      {status === "error" && !record && (
        <div className="bg-[var(--kv-red-light)] rounded-2xl p-4 flex items-start gap-3">
          <Cloud size={24} className="text-[var(--kv-red)]" weight="fill" />
          <div>
            <p className="font-semibold text-[var(--kv-red)]">Weather unavailable</p>
            <p className="text-[13px] text-[var(--kv-red)] opacity-80 mt-1">Check your connection or pull down to retry. Cached weather will appear automatically when available.</p>
            <button type="button" onClick={refetch} className="mt-3 px-4 py-2 rounded-xl bg-white text-[var(--kv-red)] font-bold text-[12px]">Try again</button>
          </div>
        </div>
      )}

      {error && record && (
        <div className="rounded-2xl bg-[var(--kv-amber-light)] border border-[var(--kv-amber)]/30 px-4 py-3 flex items-start gap-3">
          <Info size={20} className="text-[var(--kv-amber)] flex-shrink-0 mt-0.5" weight="fill" />
          <p className="text-[12px] text-[var(--kv-amber)] font-semibold leading-relaxed">Latest refresh failed, so cached weather is still shown.</p>
        </div>
      )}

      {/* ── Hourly Forecast ─────────────────────────────────────────────────── */}
      {status === "loading" && !hourly.length ? (
        <section>
          <h3 className="kv-section-h mb-3 text-[var(--kv-near-black)] px-1">Today's Forecast</h3>
          <ForecastSkeleton />
        </section>
      ) : hourly.length > 0 ? (
        <section>
          <h3 className="kv-section-h mb-3 text-[var(--kv-near-black)] px-1">Today's Forecast</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-4 px-4">
            {hourly.map((item) => (
              <div key={item.dt} className="snap-start">
                <HourSlot item={item} />
              </div>
            ))}
          </div>
        </section>
      ) : record ? (
        <section className="kv-card p-4 !shadow-sm border border-[var(--kv-divider)]">
          <h3 className="kv-section-h text-[var(--kv-near-black)]">Today's Forecast</h3>
          <p className="text-[13px] text-[var(--kv-grey-dark)] mt-2">Hourly forecast is not available yet. Current weather and farm advisory are still ready.</p>
        </section>
      ) : null}

      {record && (
        <section className={`rounded-2xl border p-4 ${toneClasses(readiness.tone)}`}>
          <div className="flex items-start gap-3">
            <CheckCircle size={24} weight="fill" className="mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-[15px] font-black leading-tight">Farm readiness: {readiness.label}</h3>
              <p className="text-[13px] font-medium opacity-90 mt-1 leading-relaxed">{readiness.detail}</p>
              {updatedAt && <p className="text-[11px] font-bold opacity-70 mt-2">Updated {updatedAt}{isOffline || isStale ? " · offline/cached" : " · live"}</p>}
            </div>
          </div>
        </section>
      )}

      {/* ── Farming Tips based on conditions ───────────────────────────────── */}
      {condition && (
        <section className="space-y-3">
          <h3 className="kv-section-h px-1 text-[var(--kv-near-black)]">Smart Advisory</h3>

          <div className="grid gap-3">
            {getAdvisoryList(condition, humidity, wind, temp, myCrops, calendarEvents).map((tip, idx) => {
              const ActionIcon = completedActions.includes(tip.id) ? CheckCircle : Circle;
              return (
              <button
                type="button"
                key={tip.id || idx} 
                className={`kv-card flex gap-4 p-4 transition-all !shadow-sm border relative overflow-hidden text-left w-full ${
                   completedActions.includes(tip.id) ? 'bg-[var(--kv-off-white)] border-[var(--kv-divider)] opacity-60' : tip.borderStyle
                }`}
                onClick={() => tip.id && toggleAction(tip.id)}
                aria-pressed={completedActions.includes(tip.id)}
              >
                <div className={`mt-0.5 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${completedActions.includes(tip.id) ? 'bg-[var(--kv-divider)] text-[var(--kv-grey-mid)]' : tip.iconBg}`}>
                  {tip.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-[15px] font-bold leading-tight mb-1 text-[var(--kv-near-black)] ${completedActions.includes(tip.id) ? 'line-through' : ''}`}>
                    {tip.title}
                  </h4>
                  <p className="text-[13px] text-[var(--kv-grey-dark)] leading-normal mt-1">{tip.text}</p>
                </div>
                <div className="self-center">
                  <ActionIcon size={24} weight="fill" className={completedActions.includes(tip.id) ? "text-[var(--kv-green)]" : "text-[var(--kv-divider)]"} />
                </div>
              </button>
            )})}
            
            {/* Contextual Soil Insight */}
            <div className="kv-card bg-[var(--kv-blue-light)] border border-[var(--kv-blue)] border-opacity-20 !shadow-none flex gap-4 p-4 mt-2">
               <div className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-full bg-[var(--kv-blue)] bg-opacity-10 text-[var(--kv-blue)] flex items-center justify-center">
                <Plant size={22} weight="fill" />
              </div>
              <div>
                <h4 className="text-[14px] font-bold leading-tight mb-1 text-[var(--kv-blue)]">Soil Status</h4>
                <p className="text-[12px] leading-relaxed font-medium text-[var(--kv-blue)] opacity-90">
                  {condition === 'Rain' 
                    ? "Hydration levels are peak. Postpone heavy equipment deployment to protect soil structure." 
                    : "Soil moisture is declining. Ideal for nutrient absorption. Consider watering soon."}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 5-Day Forecast ──────────────────────────────────────────────────── */}
      {days.length > 0 && (
        <section className="mt-4">
          <div className="flex items-center justify-between mb-3 px-1">
             <h3 className="kv-section-h text-[var(--kv-near-black)]">5-Day Outlook</h3>
             {forecastSource === "cache" && (
                <span className="text-[10px] font-bold text-[var(--kv-amber)] flex items-center gap-1 bg-[var(--kv-amber-light)] px-2 py-1 rounded-md">
                  <WarningCircle size={12} weight="bold" /> OFFLINE
                </span>
             )}
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-4 scrollbar-hide snap-x -mx-4 px-4">
            {days.map((day, i) => (
              <div key={i} className="snap-start pt-1">
                <DayCard day={day} />
              </div>
            ))}
          </div>
        </section>
      )}
      </div>
    </PullToRefresh>
  );
}

// ─── Farming Advisory Logic ──────────────────────────────────────────────────

function getAdvisoryList(condition, humidity, wind, temp, crops = [], events = []) {
  const tips = [];

  // Weather Hazards
  if (condition === "Thunderstorm") {
    tips.push({
      id: "hazard-storm",
      title: "Severe Weather Risk",
      text: "Stay sheltered. Secure livestock and disconnect outdoor irrigation systems immediately.",
      borderStyle: "border-[var(--kv-red)] bg-[var(--kv-red-light)]",
      iconBg: "bg-[var(--kv-red)] bg-opacity-20",
      icon: <WarningCircle size={22} className="text-[var(--kv-red)]" weight="fill" />,
    });
  }

  if (wind > 6) {
    tips.push({
      id: "hazard-wind",
      title: "Operation Suspension",
      text: "Wind speeds are too high for safe fertiliser/pesticide spraying. Secure high-canopy structures.",
      borderStyle: "border-[var(--kv-amber)] bg-[var(--kv-amber-light)]",
      iconBg: "bg-[var(--kv-amber)] bg-opacity-20",
      icon: <Wind size={22} className="text-[var(--kv-amber)]" weight="fill" />,
    });
  }

  // Crop-Specific
  if (crops.length > 0) {
    if (crops.includes('Rice') || crops.includes('Paddy')) {
      if (temp > 33) {
        tips.push({
          id: "crop-rice-heat",
          title: "Rice Heat Stress",
          text: "Maintain high water level in paddies to regulate temperature during this heat spike.",
          borderStyle: "border-[var(--kv-green-light)] bg-white",
          iconBg: "bg-[var(--kv-green-light)] text-[var(--kv-green)]",
          icon: <TrendUp size={20} weight="bold" />
        });
      }
    }
    
    if (crops.includes('Wheat') || crops.includes('Tomato')) {
      if (humidity > 80) {
        tips.push({
          id: "crop-fungal-wheat",
          title: "Fungal Alert",
          text: "Damp conditions detected. Wheat/Tomato are prone to blight. Avoid irrigation until air dries out.",
          borderStyle: "border-[var(--kv-amber)] bg-[var(--kv-amber-light)]",
          iconBg: "bg-[var(--kv-amber)] text-white",
          icon: <CloudFog size={22} weight="fill" />
        });
      }
    }
  }

  // General Operation
  if (condition === "Rain" || condition === "Drizzle") {
    tips.push({
      id: "op-drainage",
      title: "Hydraulic Advantage",
      text: "Natural irrigation active. Ensure drainage channels are clear of debris.",
      borderStyle: "border-[var(--kv-blue-light)]",
      iconBg: "bg-[var(--kv-blue-light)] text-[var(--kv-blue)]",
      icon: <Drop size={22} weight="fill" />,
    });
  } else if (temp > 35) {
    tips.push({
      id: "op-pre-dawn",
      title: "Thermal Management",
      text: "Extreme heat detected. Irrigate pre-dawn to minimise evaporation and root shock.",
      borderStyle: "border-[#feeadb] bg-[#feeadb]",
      iconBg: "bg-white text-[#f97316]",
      icon: <Thermometer size={22} weight="fill" />,
    });
  }

  // Baseline/Optimization Tips
  if (events.length > 0 && (condition === "Rain" || wind > 6 || temp > 35)) {
    tips.push({
      id: "calendar-weather-check",
      title: "Review Scheduled Farm Work",
      text: "Weather may affect today’s crop calendar tasks. Move spraying, transplanting, or fertilizer work to a safer window if needed.",
      borderStyle: "border-[var(--kv-blue-light)] bg-white",
      iconBg: "bg-[var(--kv-blue-light)] text-[var(--kv-blue)]",
      icon: <CalendarCheckIcon />,
    });
  }

  if (temp < 25 && condition !== "Rain") {
    tips.push({
      id: "op-labor",
      title: "Optimum Stability",
      text: "Cool, dry window detected. Ideal for labor-intensive maintenance or structural repairs.",
      borderStyle: "border-[var(--kv-green-light)]",
      iconBg: "bg-[var(--kv-green-light)] text-[var(--kv-green)]",
      icon: <Check size={22} weight="bold" />,
    });
  }

  return tips;
}

function CalendarCheckIcon() {
  return <CheckCircle size={20} weight="fill" />;
}
