import { appConfig } from "../config/appConfig";

const CACHE_KEY = "kv_finance_cache";
const APPLICATIONS_KEY = "finance_loan_applications";
const MARKETPLACE_TX_KEY = "marketplace_transaction_count";

export function getCachedFinanceData() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchFinanceData() {
  const res = await fetch(appConfig.financeDataUrl);
  if (!res.ok) {
    const err = new Error(`Finance data load failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ data, fetchedAt: Date.now() }),
  );
  return data;
}

export function getMarketplaceTransactionCount() {
  try {
    const raw = localStorage.getItem(MARKETPLACE_TX_KEY);
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function computeCreditScore(profile, txCount) {
  const base = profile?.baseScore ?? 680;
  const bonus = (profile?.scorePerTransaction ?? 20) * txCount;
  return Math.min(850, base + bonus);
}

export function computePreApprovedLimit(profile, score) {
  const base = profile?.preApprovedLimit ?? 25000;
  const next = profile?.nextTierLimit ?? 50000;
  const threshold = 750;
  return score >= threshold ? next : base;
}

export function getLoanApplications() {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLoanApplication(application) {
  const existing = getLoanApplications();
  const updated = [
    ...existing.filter((a) => a.loanId !== application.loanId),
    { ...application, appliedAt: Date.now() },
  ];
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(updated));
  return updated;
}

export function getLoanApplicationStatus(loanId) {
  const apps = getLoanApplications();
  return apps.find((a) => a.loanId === loanId) ?? null;
}
