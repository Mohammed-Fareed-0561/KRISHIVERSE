import React, { useState, useEffect } from "react";
import PriceChart from "../components/PriceChart";
import { useMandiPrices } from "../hooks/useMandiPrices";
import { useOffline } from "../hooks/useOffline";
import { useTranslation } from "react-i18next";
import {
  ArrowSquareOut,
  WifiSlash,
  ArrowsClockwise,
  Heart,
  MagnifyingGlass,
  MapPin,
  TrendUp,
  TrendDown
} from "@phosphor-icons/react";
import PullToRefresh from "../components/PullToRefresh";

const CROP_EMOJI = {
  "Paddy (Raw)": "🌾",
  Paddy: "🌾",
  Maize: "🌽",
  Groundnut: "🥜",
  Cotton: "🌿",
  Banana: "🍌",
  Tomato: "🍅",
  Onion: "🧅",
  Potato: "🥔",
};

// ─── Source badge ─────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  if (source === "network") {
    return (
      <div className="kv-chip kv-chip-green px-2 py-0.5 h-6 text-[10px]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--kv-green)] animate-pulse"></span>
        LIVE
      </div>
    );
  }
  if (source === "cache") {
    return (
      <div className="kv-chip kv-chip-blue px-2 py-0.5 h-6 text-[10px]">
        <ArrowsClockwise size={12} weight="bold" />
        CACHED
      </div>
    );
  }
  return (
    <div className="kv-chip kv-chip-grey px-2 py-0.5 h-6 text-[10px]">
      DEMO
    </div>
  );
}

// ─── Price Row Card ───────────────────────────────────────────────────────
function PriceCard({ row, isWatched, onToggleWatch }) {
  const emoji = row.emoji ?? CROP_EMOJI[row.commodity] ?? "🌱";
  
  // Calculate trend direction for design
  let isUp = true;
  if (row.minPrice && row.maxPrice) {
      const mid = (row.minPrice + row.maxPrice) / 2;
      isUp = row.price >= mid;
  }

  return (
    <div className="kv-card !shadow-sm border border-[var(--kv-divider)] p-4 flex items-center justify-between gap-3 active:scale-95 transition-transform overflow-hidden relative">
      <div className="flex items-center gap-3 w-full">
         <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center text-3xl shrink-0 ${isUp ? 'bg-[var(--kv-green-light)]' : 'bg-[var(--kv-red-light)]'}`}>
            <span>{emoji}</span>
         </div>
         <div className="flex flex-col flex-1 min-w-0 pr-2">
            <h4 className="text-[16px] font-bold text-[var(--kv-near-black)] truncate">{row.commodity}</h4>
            <div className="flex items-center gap-1 text-[var(--kv-grey-mid)] mt-0.5">
               <MapPin size={12} weight="fill" />
               <span className="text-[12px] truncate">{row.market}</span>
            </div>
         </div>
         <div className="flex flex-col items-end shrink-0 pl-2">
             <div className="flex items-center gap-1">
                <span className={`text-[12px] font-bold ${isUp ? 'text-[var(--kv-green)]' : 'text-[var(--kv-red)]'}`}>
                   {isUp ? <TrendUp size={16} weight="bold" /> : <TrendDown size={16} weight="bold" />}
                </span>
                <span className="text-[18px] font-black font-[var(--font-heading)] text-[var(--kv-near-black)]">₹{row.price}</span>
             </div>
             <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--kv-grey-mid)] mt-0.5">{row.unit ?? "PER QTL"}</span>
         </div>
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onToggleWatch(row.commodity);
        }}
        type="button"
        className="absolute top-0 right-0 p-3 pt-3.5 pr-4 rounded-bl-[16px] active:scale-90 transition-transform"
        aria-label={isWatched ? `Remove ${row.commodity} from watchlist` : `Add ${row.commodity} to watchlist`}
      >
        <Heart size={20} weight={isWatched ? "fill" : "bold"} className={isWatched ? "text-[var(--kv-red)]" : "text-[var(--kv-divider)]"} />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function PricesPage() {
  const { t } = useTranslation();
  const { isOffline } = useOffline();
  const { status, record, error, source, refetch } = useMandiPrices();

  const [staticData, setStaticData] = useState(null);
  const [activeCrop, setActiveCrop] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem("crop_watchlist");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("crop_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleWatchlist = (crop) => {
    setWatchlist((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop]
    );
  };

  useEffect(() => {
    if (!record) {
      fetch("/data/mandiPrices.json")
        .then((r) => r.json())
        .then((json) => setStaticData(json))
        .catch(() => {});
    }
  }, [record]);

  const liveRows = record?.data ?? [];
  const fallbackRows = !liveRows.length && staticData ? staticData.data : [];
  const effectiveRows = liveRows.length ? liveRows : fallbackRows;
  const effectiveSource = liveRows.length
    ? source
    : staticData
      ? "static"
      : null;

  const crops = ["All", "Watchlist", ...[...new Set(effectiveRows.map((r) => r.commodity))]];
  
  const visible = (() => {
    let list = effectiveRows;
    if (activeCrop === "Watchlist") {
       list = effectiveRows.filter(r => watchlist.includes(r.commodity));
    } else if (activeCrop !== "All") {
       list = effectiveRows.filter((r) => r.commodity === activeCrop);
    }

    if (searchQuery.trim().length > 0) {
       const q = searchQuery.toLowerCase();
       list = list.filter(r => r.commodity.toLowerCase().includes(q) || r.market.toLowerCase().includes(q));
    }
    return list;
  })();

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="flex flex-col gap-5 pt-2 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)]">
              {t("prices.title", "Mandi Prices")}
            </h1>
            <p className="text-[12px] font-medium text-[var(--kv-grey-mid)] mt-0.5 uppercase tracking-wide">
              {t("prices.unit", "Prices in ₹ per quintal")}
            </p>
          </div>
          <SourceBadge source={effectiveSource} />
        </div>

        {/* Offline banner */}
        {isOffline && (
          <div className="flex items-center gap-2 bg-[var(--kv-amber-light)] border border-[var(--kv-amber)] border-opacity-30 rounded-xl px-4 py-2.5 text-[13px] text-[var(--kv-amber)] font-medium">
            <WifiSlash size={16} weight="bold" />
            <span>{t("prices.offline", "Offline — showing saved prices")}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative flex items-center">
           <MagnifyingGlass size={20} className="absolute left-4 text-[var(--kv-grey-mid)]" weight="bold" />
           <input 
             type="text" 
             placeholder="Search crops or markets..." 
             className="kv-input pl-11 !h-12 !rounded-[16px] text-[14px]"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             aria-label="Search crops or markets"
           />
        </div>

        {/* Crop filter chips */}
        {effectiveRows.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            {crops.map((crop) => (
              <button
                key={crop}
                onClick={() => setActiveCrop(crop)}
                type="button"
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold transition-colors flex items-center gap-1.5 border active:scale-95 ${
                  activeCrop === crop
                    ? "bg-[var(--kv-near-black)] text-white border-[var(--kv-near-black)] shadow-sm"
                    : "bg-white text-[var(--kv-grey-dark)] border-[var(--kv-divider)] hover:bg-[var(--kv-off-white)]"
                }`}
                aria-pressed={activeCrop === crop}
              >
                {crop === "Watchlist" && (
                  watchlist.length > 0 ? <Heart size={14} weight="fill" className="text-[var(--kv-red)]" /> : <Heart size={14} weight="bold" />
                )}
                {CROP_EMOJI[crop] ?? ""} <span className="mt-0.5">{crop === "Watchlist" ? t("prices.favorites", "Watchlist") : crop}</span>
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {status === "loading" && !record && !staticData && (
          <div className="space-y-3 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="kv-skeleton h-[88px] w-full rounded-[16px]" />
            ))}
          </div>
        )}

        {/* Price cards and Chart */}
        {visible.length > 0 && (
          <div className="space-y-4">
            {activeCrop !== "All" && activeCrop !== "Watchlist" && !searchQuery && (
              <div className="kv-card p-2 !shadow-sm border border-[var(--kv-divider)]">
                 <PriceChart crop={activeCrop} currentPrice={visible[0]?.price} />
              </div>
            )}
            <div className="grid gap-3">
            {visible.map((r, i) => (
              <PriceCard 
                key={`${r.commodity}-${r.market}-${i}`} 
                row={r} 
                isWatched={watchlist.includes(r.commodity)}
                onToggleWatch={toggleWatchlist}
              />
            ))}
            </div>
          </div>
        )}

        {/* Empty States */}
        {activeCrop === "Watchlist" && visible.length === 0 && (
          <div className="text-center py-10 px-6 bg-[var(--kv-off-white)] rounded-[24px] border-2 border-dashed border-[var(--kv-divider)] mt-2">
            <Heart className="mx-auto text-[var(--kv-divider)] mb-3" size={48} weight="fill" />
            <p className="text-[var(--kv-grey-dark)] text-[14px] font-medium leading-relaxed max-w-[200px] mx-auto">
              {t("prices.emptyWatchlist", "Your watchlist is empty. Tap the heart to follow crop prices.")}
            </p>
          </div>
        )}
        
        {visible.length === 0 && activeCrop !== "Watchlist" && !status === "loading" && (
           <div className="text-center py-10">
              <p className="text-[14px] text-[var(--kv-grey-mid)]">No prices found for your search.</p>
           </div>
        )}

        {/* Error */}
        {status === "error" && !effectiveRows.length && (
          <div className="bg-[var(--kv-red-light)] rounded-[16px] p-4 flex items-start gap-3 border border-[var(--kv-red)] border-opacity-30">
            <div>
              <p className="font-semibold text-[var(--kv-red)] text-[14px]">{t("prices.error", "Could not load prices.")}</p>
              <p className="text-[13px] text-[var(--kv-red)] opacity-80 mt-1">{error?.message}</p>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="flex flex-col items-center gap-3 mt-4 pt-4 border-t border-[var(--kv-divider)]">
           {record?.fetchedAt && (
             <p className="text-[11px] font-medium text-[var(--kv-grey-mid)] flex items-center justify-center gap-1 uppercase tracking-wider">
               <ArrowsClockwise size={12} weight="bold" />
               {t("prices.updated", "Updated")}{" "}
               {new Date(record.fetchedAt).toLocaleString("en-IN")}
             </p>
           )}
           {staticData?.fetchedAt && !record && (
             <p className="text-[11px] font-medium text-[var(--kv-grey-mid)] text-center uppercase tracking-wider">
               {t("prices.demoNote", "Demo prices as of")}{" "}
               {new Date(staticData.fetchedAt).toLocaleDateString("en-IN")}
             </p>
           )}

           <a
             href="https://agmarknet.gov.in"
             target="_blank"
             rel="noreferrer"
             className="flex items-center justify-center gap-1.5 text-[12px] text-[var(--kv-green)] font-bold py-2 bg-[var(--kv-green-light)] px-4 rounded-full active:scale-95 transition-transform"
           >
             <ArrowSquareOut size={16} weight="bold" />
             {t("prices.liveLink", "Check live prices on Agmarknet")}
           </a>
        </div>
      </div>
    </PullToRefresh>
  );
}
