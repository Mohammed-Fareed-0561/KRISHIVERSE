import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFinance } from "../hooks/useFinance";
import { useSchemes } from "../hooks/useSchemes";
import { useMandiPrices } from "../hooks/useMandiPrices";
import { useOffline } from "../hooks/useOffline";
import PullToRefresh from "../components/PullToRefresh";
import {
  getLoanApplications,
  saveLoanApplication,
  getLoanApplicationStatus,
} from "../services/api/financeService";
import {
  CreditCard,
  TrendUp,
  FileText,
  CheckCircle,
  Clock,
  Bell,
  BellRinging,
  WifiSlash,
  X,
  ArrowSquareOut,
  TrendDown,
  Lock,
  Scroll,
} from "@phosphor-icons/react";

const CATEGORY_COLORS = {
  "Credit & Finance": "kv-chip-brown",
};

function formatCurrency(amount) {
  if (amount == null) return "—";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function getScoreRating(score, t) {
  if (score >= 750) return { label: t("finance.rating.excellent"), className: "kv-chip-green" };
  if (score >= 650) return { label: t("finance.rating.good"), className: "kv-chip-blue" };
  return { label: t("finance.rating.fair"), className: "kv-chip-amber" };
}

export default function FinancialPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOffline } = useOffline();
  const { status, data, error, source, refetch, creditScore, preApprovedLimit, marketplaceTxCount } =
    useFinance();
  const { schemes, refetch: refetchSchemes } = useSchemes();
  const { record, refetch: refetchPrices } = useMandiPrices();

  const [activeTab, setActiveTab] = useState("loans");
  const [applications, setApplications] = useState(() => getLoanApplications());
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [priceAlerts, setPriceAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem("finance_price_alerts");
      if (saved) return JSON.parse(saved);
      return data?.defaultWatchlist ?? ["Wheat", "Mustard", "Potato"];
    } catch {
      return ["Wheat", "Mustard", "Potato"];
    }
  });

  useEffect(() => {
    if (data?.defaultWatchlist && !localStorage.getItem("finance_price_alerts")) {
      setPriceAlerts(data.defaultWatchlist);
    }
  }, [data]);

  useEffect(() => {
    localStorage.setItem("finance_price_alerts", JSON.stringify(priceAlerts));
  }, [priceAlerts]);

  useEffect(() => {
    if (selectedLoan || selectedScheme) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [selectedLoan, selectedScheme]);

  const creditSchemes = useMemo(
    () => schemes.filter((s) => s.category === "Credit & Finance"),
    [schemes],
  );

  const mandiRows = useMemo(() => {
    const live = record?.data ?? [];
    if (live.length) return live;
    return [];
  }, [record]);

  const watchlistItems = useMemo(() => {
    const crops = priceAlerts.length ? priceAlerts : (data?.defaultWatchlist ?? []);
    return crops.map((crop) => {
      const row = mandiRows.find((r) =>
        r.commodity.toLowerCase().includes(crop.toLowerCase()),
      );
      if (row) {
        const mid = row.minPrice && row.maxPrice ? (row.minPrice + row.maxPrice) / 2 : row.price;
        const diff = row.price - mid;
        return {
          crop: row.commodity,
          trend: diff >= 0 ? "up" : "down",
          change: `${diff >= 0 ? "+" : ""}₹${Math.abs(Math.round(diff))}/qtl`,
          alert: priceAlerts.includes(crop) || priceAlerts.includes(row.commodity),
        };
      }
      return { crop, trend: "up", change: "—", alert: priceAlerts.includes(crop) };
    });
  }, [priceAlerts, mandiRows, data]);

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchSchemes(), refetchPrices()]);
  };

  const handleApplyLoan = (loan) => {
    const app = {
      loanId: loan.id,
      loanType: loan.type,
      amount: loan.amount,
      status: "submitted",
    };
    const updated = saveLoanApplication(app);
    setApplications(updated);
    setSelectedLoan(null);
  };

  const togglePriceAlert = (crop) => {
    setPriceAlerts((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop],
    );
  };

  const getLoanButton = (loan) => {
    const existing = applications.find((a) => a.loanId === loan.id) ??
      getLoanApplicationStatus(loan.id);
    if (existing) {
      return { label: t("finance.loans.track"), disabled: false, variant: "outline" };
    }
    if (!loan.eligible || loan.action === "locked") {
      return { label: t("finance.loans.locked"), disabled: true, variant: "locked" };
    }
    if (loan.action === "eligible") {
      return { label: t("finance.loans.eligible"), disabled: false, variant: "primary" };
    }
    return { label: t("finance.loans.apply"), disabled: false, variant: "outline" };
  };

  const rating = creditScore ? getScoreRating(creditScore, t) : null;
  const enrollments = data?.enrollments ?? [];
  const loans = data?.loans ?? [];
  const forecast = data?.marketForecast;
  const promo = data?.promo;
  const txNeeded = Math.max(
    0,
    (data?.creditProfile?.transactionsForNextTier ?? 3) - marketplaceTxCount,
  );

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="flex flex-col gap-4 pb-6 pt-2">
        {/* Header */}
        <div>
          <h1 className="text-[22px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)]">
            {t("finance.title", "Financial Empowerment")}
          </h1>
          <p className="text-[12px] font-medium text-[var(--kv-grey-mid)] mt-0.5">
            {t("finance.subtitle", "Credit, schemes, and market intelligence")}
          </p>
        </div>

        {/* Offline banner */}
        {isOffline && (
          <div className="flex items-center gap-2 bg-[var(--kv-amber-light)] border border-[var(--kv-amber)] border-opacity-30 rounded-xl px-4 py-2.5 text-[13px] text-[var(--kv-amber)] font-medium">
            <WifiSlash size={16} weight="bold" />
            <span>{t("finance.offline", "Offline — showing saved finance data")}</span>
          </div>
        )}

        {/* Loading */}
        {status === "loading" && !data && (
          <div className="space-y-3">
            <div className="kv-skeleton h-[140px] w-full rounded-[16px]" />
            <div className="kv-skeleton h-[48px] w-full rounded-[16px]" />
            {[1, 2].map((i) => (
              <div key={i} className="kv-skeleton h-[100px] w-full rounded-[16px]" />
            ))}
          </div>
        )}

        {/* Error */}
        {status === "error" && !data && (
          <div className="bg-[var(--kv-red-light)] rounded-[16px] p-4 border border-[var(--kv-red)] border-opacity-30 text-[13px] text-[var(--kv-red)]">
            {t("finance.error", "Finance data could not be loaded.")}{" "}
            {error?.message ?? ""}
          </div>
        )}

        {data && (
          <>
            {/* Credit Score Card */}
            <div className="kv-card !shadow-md border-0 p-5 bg-[var(--kv-green)] text-white overflow-hidden relative">
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-white/70 text-[12px] font-bold uppercase tracking-wider">
                    {t("finance.creditScore", "Estimated Credit Score")}
                  </p>
                  <h2 className="text-[40px] font-black font-[var(--font-heading)] leading-none mt-1">
                    {creditScore}
                  </h2>
                  {rating && (
                    <span className={`kv-chip ${rating.className} mt-2 inline-flex items-center gap-1`}>
                      <CheckCircle size={14} weight="fill" />
                      {rating.label}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-white/70 text-[12px] font-bold uppercase tracking-wider">
                    {t("finance.preApproved", "Pre-Approved Limit")}
                  </p>
                  <p className="text-[24px] font-black font-[var(--font-heading)] mt-1">
                    {formatCurrency(preApprovedLimit)}
                  </p>
                </div>
              </div>
              <div className="h-[1px] w-full bg-white/20 my-3 relative z-10" />
              <p className="text-[11px] text-white/60 italic relative z-10">
                {t(
                  "finance.scoreNote",
                  "Based on marketplace activity and repayment history.",
                )}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[var(--kv-off-white)] rounded-[14px] p-1 border border-[var(--kv-divider)]">
              {[
                { id: "loans", icon: CreditCard, label: t("finance.tab.loans", "Micro-Loans") },
                { id: "schemes", icon: FileText, label: t("finance.tab.schemes", "Schemes") },
                { id: "market", icon: TrendUp, label: t("finance.tab.market", "Market Intel") },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[12px] font-bold transition-all active:scale-95 ${
                    activeTab === tab.id
                      ? "bg-white text-[var(--kv-green)] shadow-sm"
                      : "text-[var(--kv-grey-mid)]"
                  }`}
                >
                  <tab.icon size={16} weight={activeTab === tab.id ? "fill" : "bold"} />
                  <span className="hidden xs:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* ── Loans Tab ─────────────────────────────────────────── */}
            {activeTab === "loans" && (
              <div className="flex flex-col gap-3">
                {promo && (
                  <div className="flex gap-3 bg-[var(--kv-blue-light)] border-l-4 border-[var(--kv-blue)] p-4 rounded-r-[16px]">
                    <Clock size={20} className="text-[var(--kv-blue)] shrink-0 mt-0.5" weight="fill" />
                    <div>
                      <h4 className="font-bold text-[14px] text-[var(--kv-near-black)]">
                        {promo.title}
                      </h4>
                      <p className="text-[13px] text-[var(--kv-grey-dark)] mt-0.5">
                        {promo.message}
                      </p>
                      {promo.deadline && (
                        <p className="text-[11px] font-bold text-[var(--kv-blue)] mt-1 uppercase tracking-wider">
                          {t("finance.deadline", "Deadline")}:{" "}
                          {new Date(promo.deadline).toLocaleDateString("en-IN")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {loans.map((loan) => {
                  const btn = getLoanButton(loan);
                  return (
                    <div
                      key={loan.id}
                      className="kv-card !shadow-sm border border-[var(--kv-divider)] p-4"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[15px] text-[var(--kv-near-black)]">
                            {loan.type}
                          </h3>
                          <p className="text-[12px] text-[var(--kv-grey-mid)] mt-1">
                            {loan.description}
                          </p>
                          <p className="text-[12px] text-[var(--kv-grey-dark)] mt-2">
                            {t("finance.rate", "Rate")}:{" "}
                            <span className="text-[var(--kv-green)] font-bold">{loan.rate}</span>
                          </p>
                          {loan.action === "locked" && loan.unlockHint && (
                            <p className="text-[11px] text-[var(--kv-amber)] font-medium mt-1 flex items-center gap-1">
                              <Lock size={12} weight="bold" />
                              {loan.unlockHint}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[18px] font-black text-[var(--kv-near-black)]">
                            {formatCurrency(loan.amount)}
                          </p>
                          <button
                            disabled={btn.disabled}
                            onClick={() => {
                              if (btn.variant === "locked") return;
                              const existing = applications.find((a) => a.loanId === loan.id);
                              if (existing) {
                                setSelectedLoan({ ...loan, application: existing });
                              } else {
                                setSelectedLoan(loan);
                              }
                            }}
                            className={`mt-2 px-4 py-1.5 rounded-full text-[12px] font-bold active:scale-95 transition-transform ${
                              btn.variant === "primary"
                                ? "bg-[var(--kv-green)] text-white"
                                : btn.variant === "locked"
                                  ? "bg-[var(--kv-off-white)] text-[var(--kv-grey-mid)] cursor-not-allowed"
                                  : "border border-[var(--kv-green)] text-[var(--kv-green)]"
                            }`}
                          >
                            {btn.label}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Improve score CTA */}
                <div className="mt-2 p-6 border-2 border-dashed border-[var(--kv-divider)] rounded-[20px] flex flex-col items-center text-center bg-[var(--kv-off-white)]">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm">
                    <TrendUp size={24} className="text-[var(--kv-grey-mid)]" weight="duotone" />
                  </div>
                  <h4 className="font-bold text-[15px] text-[var(--kv-near-black)]">
                    {t("finance.improveScore", "Improve Your Score")}
                  </h4>
                  <p className="text-[13px] text-[var(--kv-grey-dark)] max-w-xs mt-1 leading-relaxed">
                    {txNeeded > 0
                      ? t("finance.improveScoreHint", {
                          count: txNeeded,
                          limit: formatCurrency(data.creditProfile?.nextTierLimit ?? 50000),
                          defaultValue: `Complete ${txNeeded} more marketplace transactions to unlock ${formatCurrency(data.creditProfile?.nextTierLimit ?? 50000)} credit limit.`,
                        })
                      : t(
                          "finance.scoreMaxed",
                          "You've unlocked the highest tier! Keep trading to maintain your score.",
                        )}
                  </p>
                  <button
                    onClick={() => navigate("/marketplace")}
                    className="mt-3 text-[13px] font-bold text-[var(--kv-green)] active:scale-95"
                  >
                    {t("finance.goToMarketplace", "Go to Marketplace →")}
                  </button>
                </div>
              </div>
            )}

            {/* ── Schemes Tab ───────────────────────────────────────── */}
            {activeTab === "schemes" && (
              <div className="flex flex-col gap-3">
                <h3 className="text-[13px] font-bold text-[var(--kv-grey-mid)] uppercase tracking-wider">
                  {t("finance.myEnrollments", "My Enrollments")}
                </h3>

                {enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="kv-card !shadow-sm border border-[var(--kv-divider)] overflow-hidden"
                  >
                    <div className="p-4 flex gap-3">
                      <div className="w-12 h-12 bg-[var(--kv-green-light)] rounded-[14px] flex items-center justify-center shrink-0">
                        <FileText size={24} className="text-[var(--kv-green)]" weight="duotone" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[15px] text-[var(--kv-near-black)] leading-tight">
                          {enrollment.name}
                        </h3>
                        <div className="flex justify-between items-end mt-2 gap-2">
                          <div>
                            <p className="text-[10px] text-[var(--kv-grey-mid)] uppercase tracking-wider font-bold flex items-center gap-1">
                              {enrollment.deadline ? (
                                <>
                                  <Clock size={12} weight="bold" />
                                  {t("finance.deadline", "Deadline")}
                                </>
                              ) : (
                                <>
                                  <CheckCircle size={12} weight="fill" />
                                  {t("finance.nextPayment", "Next Payment")}
                                </>
                              )}
                            </p>
                            <p className="font-semibold text-[13px] text-[var(--kv-grey-dark)]">
                              {enrollment.deadline || enrollment.nextInstallment
                                ? new Date(
                                    enrollment.deadline || enrollment.nextInstallment,
                                  ).toLocaleDateString("en-IN")
                                : "—"}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`kv-chip text-[10px] ${
                                enrollment.status === "active"
                                  ? "kv-chip-green"
                                  : "kv-chip-amber"
                              }`}
                            >
                              {enrollment.status === "active"
                                ? t("finance.status.active", "Active")
                                : t("finance.status.pending", "Pending")}
                            </span>
                            {enrollment.amount != null && (
                              <p className="text-[16px] font-black text-[var(--kv-green)] mt-1">
                                {formatCurrency(enrollment.amount)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[var(--kv-off-white)] px-4 py-2 border-t border-[var(--kv-divider)] flex justify-between items-center">
                      <span className="text-[11px] text-[var(--kv-grey-mid)] font-medium">
                        ID: {enrollment.referenceId}
                      </span>
                      <button
                        onClick={() => navigate("/schemes")}
                        className="text-[12px] text-[var(--kv-green)] font-bold active:scale-95"
                      >
                        {t("finance.trackApplication", "Track Application")}
                      </button>
                    </div>
                  </div>
                ))}

                {creditSchemes.length > 0 && (
                  <>
                    <h3 className="text-[13px] font-bold text-[var(--kv-grey-mid)] uppercase tracking-wider mt-2">
                      {t("finance.creditSchemes", "Credit & Finance Schemes")}
                    </h3>
                    {creditSchemes.map((scheme) => (
                      <button
                        key={scheme.id}
                        onClick={() => setSelectedScheme(scheme)}
                        className="kv-card !shadow-sm border border-[var(--kv-divider)] p-4 text-left active:scale-[0.98] transition-transform"
                      >
                        <span className={`kv-chip ${CATEGORY_COLORS[scheme.category] ?? "kv-chip-grey"}`}>
                          {scheme.category}
                        </span>
                        <h3 className="text-[15px] font-bold text-[var(--kv-near-black)] mt-2 leading-tight">
                          {scheme.name}
                        </h3>
                        <p className="text-[13px] text-[var(--kv-grey-dark)] mt-1 line-clamp-2">
                          {scheme.summary}
                        </p>
                      </button>
                    ))}
                  </>
                )}

                <button
                  onClick={() => navigate("/schemes")}
                  className="kv-btn-secondary w-full mt-1"
                >
                  <Scroll size={18} weight="bold" />
                  {t("finance.browseSchemes", "Browse More Schemes")}
                </button>
              </div>
            )}

            {/* ── Market Tab ────────────────────────────────────────── */}
            {activeTab === "market" && (
              <div className="flex flex-col gap-3">
                {forecast?.profitAlert && (
                  <div className="flex gap-3 bg-[var(--kv-green-light)] border border-[var(--kv-green)] border-opacity-30 rounded-[16px] p-4">
                    <BellRinging size={22} className="text-[var(--kv-green)] shrink-0" weight="fill" />
                    <div>
                      <h3 className="font-bold text-[14px] text-[var(--kv-green)]">
                        {t("finance.profitOpportunity", "Profit Opportunity")}
                      </h3>
                      <p className="text-[12px] text-[var(--kv-grey-dark)] mt-0.5">
                        {forecast.profitAlert.message}
                      </p>
                    </div>
                  </div>
                )}

                <div className="kv-card !shadow-sm border border-[var(--kv-divider)] overflow-hidden p-0">
                  <div className="px-4 py-3 bg-[var(--kv-off-white)] border-b border-[var(--kv-divider)] flex justify-between items-center">
                    <span className="text-[11px] font-bold text-[var(--kv-grey-mid)] uppercase tracking-wider">
                      {t("finance.watchlist", "Your Watchlist")}
                    </span>
                    <button
                      onClick={() => navigate("/prices")}
                      className="text-[11px] font-bold text-[var(--kv-green)]"
                    >
                      {t("finance.viewAllPrices", "View all →")}
                    </button>
                  </div>
                  <div className="divide-y divide-[var(--kv-divider)]">
                    {watchlistItems.map((item) => (
                      <div
                        key={item.crop}
                        className="p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              item.trend === "up"
                                ? "bg-[var(--kv-green)]"
                                : "bg-[var(--kv-red)]"
                            }`}
                          />
                          <span className="font-bold text-[14px] text-[var(--kv-near-black)]">
                            {item.crop}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <p
                            className={`text-[13px] font-bold flex items-center gap-0.5 ${
                              item.trend === "up"
                                ? "text-[var(--kv-green)]"
                                : "text-[var(--kv-red)]"
                            }`}
                          >
                            {item.trend === "up" ? (
                              <TrendUp size={14} weight="bold" />
                            ) : (
                              <TrendDown size={14} weight="bold" />
                            )}
                            {item.change}
                          </p>
                          <button
                            onClick={() => togglePriceAlert(item.crop)}
                            className={`p-2 rounded-[10px] active:scale-90 transition-transform ${
                              item.alert
                                ? "bg-[var(--kv-green-light)] text-[var(--kv-green)]"
                                : "bg-[var(--kv-off-white)] text-[var(--kv-grey-mid)]"
                            }`}
                          >
                            <Bell
                              size={16}
                              weight={item.alert ? "fill" : "bold"}
                            />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {forecast && (
                  <div className="kv-card !shadow-sm border border-[var(--kv-divider)] p-5 bg-[var(--kv-near-black)] text-white">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <TrendUp size={22} className="text-[var(--kv-green)]" weight="duotone" />
                      </div>
                      <h3 className="font-bold text-[16px]">
                        {t("finance.aiForecast", "AI Market Forecast")}
                      </h3>
                    </div>
                    <p className="text-[13px] text-white/80 leading-relaxed mb-4">
                      {forecast.summary}
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white/10 rounded-[12px] p-3 text-center">
                        <p className="text-[10px] text-white/50 font-bold uppercase mb-1">
                          {t("finance.confidence", "Confidence")}
                        </p>
                        <p className="text-[18px] font-black">{forecast.confidence}%</p>
                      </div>
                      <div className="flex-1 bg-white/10 rounded-[12px] p-3 text-center">
                        <p className="text-[10px] text-white/50 font-bold uppercase mb-1">
                          {t("finance.impact", "Impact")}
                        </p>
                        <p className="text-[18px] font-black text-[var(--kv-green)] capitalize">
                          {forecast.impact}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {source && (
              <p className="text-[10px] text-center text-[var(--kv-grey-mid)] uppercase tracking-wider font-medium">
                {source === "network"
                  ? t("finance.sourceLive", "Live data")
                  : t("finance.sourceCached", "Cached data")}
              </p>
            )}
          </>
        )}

        {/* ── Loan Application Sheet ───────────────────────────────── */}
        {selectedLoan && (
          <>
            <div className="kv-sheet-overlay" onClick={() => setSelectedLoan(null)} />
            <div className="kv-sheet" style={{ maxHeight: "85vh" }}>
              <div className="kv-sheet-handle" />
              <div className="flex items-center justify-between p-4 pb-2 border-b border-[var(--kv-divider)]">
                <h3 className="font-[var(--font-heading)] font-bold text-[18px] text-[var(--kv-near-black)]">
                  {selectedLoan.application
                    ? t("finance.applicationStatus", "Application Status")
                    : t("finance.applyLoan", "Apply for Loan")}
                </h3>
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--kv-off-white)]"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>
              <div className="p-4 pb-8">
                <h4 className="font-bold text-[16px] text-[var(--kv-near-black)]">
                  {selectedLoan.type}
                </h4>
                <p className="text-[24px] font-black text-[var(--kv-green)] mt-1">
                  {formatCurrency(selectedLoan.amount)}
                </p>
                <p className="text-[13px] text-[var(--kv-grey-dark)] mt-2">
                  {selectedLoan.description}
                </p>

                {selectedLoan.application ? (
                  <div className="mt-6 bg-[var(--kv-green-light)] rounded-[16px] p-4">
                    <div className="flex items-center gap-2 text-[var(--kv-green)] font-bold">
                      <CheckCircle size={20} weight="fill" />
                      {t("finance.applicationSubmitted", "Application Submitted")}
                    </div>
                    <p className="text-[13px] text-[var(--kv-grey-dark)] mt-2">
                      {t(
                        "finance.applicationPending",
                        "Your application is under review. You will be notified within 2-3 business days.",
                      )}
                    </p>
                    <p className="text-[11px] text-[var(--kv-grey-mid)] mt-3">
                      {t("finance.appliedOn", "Applied on")}:{" "}
                      {new Date(selectedLoan.application.appliedAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => handleApplyLoan(selectedLoan)}
                    className="kv-btn-primary w-full mt-6"
                  >
                    <CreditCard size={20} weight="bold" />
                    {t("finance.confirmApply", "Confirm Application")}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Scheme Detail Sheet ──────────────────────────────────── */}
        {selectedScheme && (
          <>
            <div className="kv-sheet-overlay" onClick={() => setSelectedScheme(null)} />
            <div className="kv-sheet" style={{ maxHeight: "90vh" }}>
              <div className="kv-sheet-handle" />
              <div className="flex items-center justify-between p-4 pb-2 border-b border-[var(--kv-divider)] sticky top-0 bg-white z-10 rounded-t-[24px]">
                <h3 className="font-[var(--font-heading)] font-bold text-[18px] text-[var(--kv-near-black)] line-clamp-1 flex-1 pr-2">
                  {selectedScheme.name}
                </h3>
                <button
                  onClick={() => setSelectedScheme(null)}
                  className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-[var(--kv-off-white)]"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto pb-10">
                {selectedScheme.fullName && (
                  <p className="text-[14px] font-medium text-[var(--kv-grey-dark)] mb-4">
                    {selectedScheme.fullName}
                  </p>
                )}
                <p className="text-[15px] leading-relaxed text-[var(--kv-near-black)] mb-6">
                  {selectedScheme.summary}
                </p>
                {selectedScheme.link && (
                  <a
                    href={selectedScheme.link}
                    target="_blank"
                    rel="noreferrer"
                    className="kv-btn-primary"
                  >
                    <ArrowSquareOut size={20} weight="bold" />
                    {t("finance.visitOfficial", "Visit Official Site")}
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}
