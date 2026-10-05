import React, { useState, useEffect } from "react";
import { useSchemes } from "../hooks/useSchemes";
import { useOffline } from "../hooks/useOffline";
import PullToRefresh from "../components/PullToRefresh";
import {
  CaretRight,
  ArrowSquareOut,
  WifiSlash,
  FileText,
  CalendarBlank,
  CheckCircle,
  X,
  Scroll
} from "@phosphor-icons/react";

// ─── Category colour map ───────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  "Income Support": "kv-chip-green",
  "Crop Insurance": "kv-chip-amber",
  "Irrigation": "kv-chip-blue",
  "Credit & Finance": "kv-chip-brown",
  "Seeds & Inputs": "kv-chip-green",
  "Equipment": "kv-chip-amber",
  "Soil & Fertiliser": "kv-chip-grey",
  "Horticulture": "kv-chip-green",
  "Allied Farming": "kv-chip-blue",
  "Development": "kv-chip-grey",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchemesPage() {
  const { isOffline } = useOffline();
  const { status, schemes, error, source, refetch } = useSchemes();
  const [filter, setFilter] = useState("All");
  const [selectedScheme, setSelectedScheme] = useState(null);

  useEffect(() => {
    if (selectedScheme) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [selectedScheme]);

  const categories = [
    "All",
    ...[...new Set(schemes.map((s) => s.category).filter(Boolean))],
  ];
  const visible =
    filter === "All" ? schemes : schemes.filter((s) => s.category === filter);

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="flex flex-col gap-4 pb-6 pt-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)]">
              Government Schemes
            </h1>
            <p className="text-[12px] font-medium text-[var(--kv-grey-mid)] mt-0.5">
              Financial aid and agricultural benefits
            </p>
          </div>
        </div>

        {/* Offline banner */}
        {isOffline && (
          <div className="flex items-center gap-2 bg-[var(--kv-amber-light)] border border-[var(--kv-amber)] border-opacity-30 rounded-xl px-4 py-2.5 text-[13px] text-[var(--kv-amber)] font-medium">
            <WifiSlash size={16} weight="bold" />
            <span>Offline — showing saved schemes</span>
          </div>
        )}

        {/* Category filter pills */}
        {schemes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 mt-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold transition-colors active:scale-95 ${
                  filter === cat
                    ? "bg-[var(--kv-green)] text-white shadow-sm"
                    : "bg-white text-[var(--kv-grey-dark)] border border-[var(--kv-divider)] hover:bg-[var(--kv-off-white)]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {status === "loading" && !schemes.length && (
          <div className="space-y-3 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="kv-skeleton h-[110px] w-full rounded-[16px]" />
            ))}
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="bg-[var(--kv-red-light)] rounded-[16px] p-4 border border-[var(--kv-red)] border-opacity-30 text-[13px] text-[var(--kv-red)] mt-2">
             Schemes could not be loaded. {error?.message ?? "Ensure network connection."}
          </div>
        )}

        {/* Scheme cards */}
        {visible.length > 0 && (
           <div className="flex flex-col gap-3 mt-2">
             {visible.map((s) => {
               const badge = CATEGORY_COLORS[s.category] ?? "kv-chip-grey";
               return (
                  <button 
                     key={s.id} 
                     onClick={() => setSelectedScheme(s)}
                     className="kv-card !shadow-sm border border-[var(--kv-divider)] p-4 flex flex-col text-left active:scale-[0.98] transition-transform"
                  >
                     <div className="flex flex-wrap items-center justify-between gap-2 w-full mb-2">
                        <span className={`kv-chip ${badge}`}>{s.category}</span>
                        {s.status === "active" && (
                           <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--kv-green)] uppercase tracking-wider bg-[var(--kv-green-light)] px-2 py-0.5 rounded-md">
                              <CheckCircle size={12} weight="fill" /> Active
                           </span>
                        )}
                     </div>
                     <h3 className="text-[16px] font-bold text-[var(--kv-near-black)] leading-tight flex items-center pr-2">
                        {s.name}
                     </h3>
                     <p className="text-[13px] text-[var(--kv-grey-dark)] leading-normal mt-2 line-clamp-2">
                        {s.summary}
                     </p>
                  </button>
               );
             })}
           </div>
        )}

        {/* Empty filtered state */}
        {visible.length === 0 && schemes.length > 0 && (
          <div className="text-center py-12 px-6 bg-[var(--kv-off-white)] rounded-[24px] border-2 border-dashed border-[var(--kv-divider)] mt-4">
             <Scroll size={48} className="mx-auto text-[var(--kv-divider)] mb-3" weight="duotone" />
             <p className="text-[14px] text-[var(--kv-grey-dark)] font-medium">No schemes found in this category.</p>
          </div>
        )}

        {/* ── Bottom Sheet Drawer ──────────────────────────────────────────────────────────── */}
        {selectedScheme && (
          <>
            <div 
              className="kv-sheet-overlay" 
              onClick={() => setSelectedScheme(null)}
            />
            <div className="kv-sheet" style={{ maxHeight: '90vh' }}>
              <div className="kv-sheet-handle"></div>
              
              <div className="flex items-center justify-between p-4 pb-2 border-b border-[var(--kv-divider)] sticky top-0 bg-white z-10 rounded-t-[24px]">
                <h3 className="font-[var(--font-heading)] font-bold text-[18px] text-[var(--kv-near-black)] line-clamp-1 flex-1 pr-2">
                   {selectedScheme.name}
                </h3>
                <button 
                  onClick={() => setSelectedScheme(null)}
                  className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-[var(--kv-off-white)] text-[var(--kv-grey-dark)] active:bg-[var(--kv-divider)] transition-colors"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto pb-10">
                 {selectedScheme.fullName && (
                    <p className="text-[14px] font-medium text-[var(--kv-grey-dark)] mb-4 leading-snug">
                       {selectedScheme.fullName}
                    </p>
                 )}

                 <div className="flex flex-wrap items-center gap-2 mb-6">
                    <span className={`kv-chip ${CATEGORY_COLORS[selectedScheme.category] ?? "kv-chip-grey"}`}>
                      {selectedScheme.category}
                    </span>
                    {selectedScheme.status === "active" && (
                        <span className="kv-chip kv-chip-green">
                          <CheckCircle size={14} weight="fill" /> Active
                        </span>
                    )}
                 </div>

                 <p className="text-[15px] leading-relaxed text-[var(--kv-near-black)] mb-6">
                    {selectedScheme.summary}
                 </p>

                 {/* Benefits */}
                 {Array.isArray(selectedScheme.benefits) && selectedScheme.benefits.length > 0 && (
                   <div className="mb-6">
                     <h4 className="kv-section-h mb-3 text-[var(--kv-green)] flex items-center gap-2">
                        <CheckCircle size={20} weight="fill" /> Benefits
                     </h4>
                     <ul className="space-y-3">
                       {selectedScheme.benefits.map((b, i) => (
                         <li key={i} className="flex items-start gap-2 text-[14px] leading-relaxed text-[var(--kv-near-black)]">
                           <div className="w-1.5 h-1.5 rounded-full bg-[var(--kv-green)] mt-2 shrink-0"></div>
                           <span>{b}</span>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}

                 {/* Eligibility */}
                 {selectedScheme.eligibility && (
                   <div className="mb-6">
                     <h4 className="kv-section-h mb-2">Who can apply</h4>
                     <p className="text-[14px] leading-relaxed text-[var(--kv-grey-dark)]">{selectedScheme.eligibility}</p>
                   </div>
                 )}

                 {/* How to apply */}
                 {selectedScheme.howToApply && (
                   <div className="bg-[var(--kv-brown-light)] rounded-[16px] p-4 mb-6">
                     <h4 className="text-[14px] font-bold text-[var(--kv-brown)] uppercase tracking-wider mb-2">
                       How to Apply
                     </h4>
                     <p className="text-[14px] leading-relaxed text-[var(--kv-near-black)]">{selectedScheme.howToApply}</p>
                   </div>
                 )}

                 {/* Documents */}
                 {Array.isArray(selectedScheme.documents) && selectedScheme.documents.length > 0 && (
                   <div className="mb-6">
                     <h4 className="flex items-center gap-2 text-[13px] font-bold text-[var(--kv-grey-mid)] uppercase tracking-wider mb-3">
                       <FileText size={16} weight="bold" /> Documents Needed
                     </h4>
                     <div className="flex flex-wrap gap-2">
                       {selectedScheme.documents.map((doc, i) => (
                         <span key={i} className="px-3 py-1.5 bg-[var(--kv-off-white)] border border-[var(--kv-divider)] rounded-lg text-[13px] font-medium text-[var(--kv-near-black)]">
                           {doc}
                         </span>
                       ))}
                     </div>
                   </div>
                 )}

                 <div className="h-[1px] w-full bg-[var(--kv-divider)] my-6"></div>

                 {/* Deadline + link */}
                 <div className="flex flex-col gap-4">
                   {selectedScheme.deadline && (
                     <div className="flex items-center gap-2 text-[14px] text-[var(--kv-red)] font-bold bg-[var(--kv-red-light)] p-3 rounded-xl border border-[var(--kv-red)] border-opacity-30">
                       <CalendarBlank size={20} weight="fill" />
                       <span>Deadline: {selectedScheme.deadline}</span>
                     </div>
                   )}
                   {selectedScheme.link && (
                     <a
                       href={selectedScheme.link}
                       target="_blank"
                       rel="noreferrer"
                       className="kv-btn-primary"
                     >
                       <ArrowSquareOut size={20} weight="bold" />
                       Visit Official Site
                     </a>
                   )}
                 </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}
