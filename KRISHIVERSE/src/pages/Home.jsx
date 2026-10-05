import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Leaf,
  Stethoscope,
  CloudSun,
  Scroll,
  PhoneCall,
  TrendUp,
  TrendDown,
  MapPin
} from "@phosphor-icons/react";
import { useWeather } from "../hooks/useWeather";
import PullToRefresh from "../components/PullToRefresh";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "good_morning";
  if (hour < 17) return "good_afternoon";
  return "good_evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const WEATHER_EMOJI = {
  Clear: "☀️",
  Clouds: "☁️",
  Rain: "🌧️",
  Drizzle: "🌦️",
  Thunderstorm: "⛈️",
  Snow: "❄️",
  Mist: "🌫️",
};

export default function Home() {
  const { t } = useTranslation();
  const { record, status, refetch } = useWeather();

  const city = record?.data?.name ?? "Coimbatore";
  const temp = record?.data?.main?.temp;
  const condition = record?.data?.weather?.[0]?.main ?? "—";
  const emoji = WEATHER_EMOJI[condition] ?? "🌤️";

  const greetingKey = getGreeting();

  const QUICK_ACTIONS = [
    { id: "ask", icon: Leaf, label: "Ask Expert", path: "/ask", color: "var(--kv-green)" },
    { id: "diagnose", icon: Stethoscope, label: "Crop Disease", path: "/diagnose", color: "var(--kv-brown)" },
    { id: "weather", icon: CloudSun, label: "Full Forecast", path: "/weather", color: "var(--kv-blue)" },
    { id: "schemes", icon: Scroll, label: "Govt Schemes", path: "/schemes", color: "var(--kv-amber)" },
  ];

  const MOCK_PRICES = [
    { crop: "Tomato", price: "₹24/kg", trend: "up", market: "Uzhavar Sandhai" },
    { crop: "Onion", price: "₹45/kg", trend: "down", market: "Town Market" },
    { crop: "Potato", price: "₹32/kg", trend: "up", market: "Uzhavar Sandhai" },
  ];

  return (
    <PullToRefresh onRefresh={async () => { if (refetch) await refetch(); }}>
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)]">
              {t(`home.${greetingKey}`, greetingKey === "good_morning" ? "Good Morning!" : greetingKey === "good_afternoon" ? "Good Afternoon!" : "Good Evening!")}
            </h1>
            <p className="text-[13px] text-[var(--kv-grey-mid)] mt-1">{formatDate()}</p>
          </div>
        </div>

        {/* Weather Hero Card */}
        <div 
          className="kv-card relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--kv-green) 0%, #155a34 100%)', color: 'var(--kv-white)' }}
        >
          {status === "loading" && !record ? (
             <div className="animate-pulse flex flex-col gap-2 p-2">
                 <div className="h-6 w-32 bg-white/20 blur-sm rounded"></div>
                 <div className="h-12 w-24 bg-white/20 blur-sm rounded mt-2"></div>
             </div>
          ) : (
            <div className="flex items-center justify-between p-1">
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 opacity-90 mb-1">
                      <MapPin size={16} weight="fill" />
                      <span className="text-[14px] font-semibold">{city}</span>
                    </div>
                    <div className="text-[48px] font-black font-[var(--font-heading)] leading-none mt-1">
                      {typeof temp === "number" ? `${Math.round(temp)}°` : "—"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[40px] drop-shadow-sm">{emoji}</span>
                    <div className="text-[14px] font-medium opacity-90 mt-1">
                      {condition}
                    </div>
                  </div>
                </div>
                
                {/* Weather Tip Overlay */}
                <div className="mt-5 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                  <p className="text-[14px] leading-tight text-white m-0">Today is a good day for fertilizer spraying in the field.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions (2x2 Grid) */}
        <div>
          <h2 className="kv-section-h mb-3 text-[var(--kv-near-black)]">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link 
                key={action.id} 
                to={action.path}
                className="kv-card flex flex-col items-center justify-center p-4 gap-3 text-center active:scale-95 transition-transform"
              >
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${action.color}10`, color: action.color }}
                >
                  <action.icon size={28} weight="duotone" />
                </div>
                <div className="text-[15px] leading-tight text-[var(--kv-near-black)]">{action.label}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Mandi Price Strip */}
        <div>
          <div className="flex items-center justify-between mb-3">
             <h2 className="kv-section-h text-[var(--kv-near-black)]">Today's Prices</h2>
             <Link to="/prices" className="text-[13px] font-semibold text-[var(--kv-green)] active:opacity-70">View All</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 snap-x">
             {MOCK_PRICES.map((item, idx) => (
               <Link to="/prices" key={idx} className="kv-card min-w-[150px] snap-center flex flex-col p-3 border border-[var(--kv-divider)] shadow-none shrink-0 active:scale-95 transition-transform">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex flex-col">
                     <div className="kv-tamil text-[14px] leading-tight text-[var(--kv-near-black)]">{item.tamil}</div>
                     <div className="kv-eng-sub text-[11px] mt-0.5">{item.crop}</div>
                   </div>
                   {item.trend === 'up' ? (
                     <TrendUp size={18} weight="bold" className="text-[var(--kv-green)] ml-2" />
                   ) : (
                     <TrendDown size={18} weight="bold" className="text-[var(--kv-red)] ml-2" />
                   )}
                 </div>
                 <div className="text-[18px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)] mt-1">{item.price}</div>
                 <div className="text-[11px] text-[var(--kv-grey-mid)] mt-1 truncate">{item.market}</div>
               </Link>
             ))}
          </div>
        </div>

        {/* Kisan Helpline */}
        <div className="mt-2 text-center pb-2">
          <a href="tel:18001801551" className="kv-btn-call">
            <PhoneCall size={26} weight="fill" />
            <div className="flex flex-col items-start text-left">
              <span className="text-white text-[16px] leading-tight">Agricultural Helpline</span>
              <span className="text-[12px] font-medium opacity-90 leading-tight block mt-0.5">Call Helpline (Toll Free)</span>
            </div>
          </a>
        </div>
      </div>
    </PullToRefresh>
  );
}
