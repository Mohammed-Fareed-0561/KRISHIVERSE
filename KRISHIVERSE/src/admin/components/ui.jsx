import React from "react";
import { ArrowsClockwiseIcon, ChartBarIcon, WarningIcon } from "@phosphor-icons/react";

export function ProdBadge() {
  return (
    <span className="badge badge-info badge-sm gap-1 normal-case">
      <ChartBarIcon aria-hidden />
      Production telemetry
    </span>
  );
}

export function EvalBadge() {
  return (
    <span className="badge badge-warning badge-sm gap-1 normal-case" data-testid="eval-badge">
      <WarningIcon aria-hidden />
      Evaluation dataset — not live farmer accuracy
    </span>
  );
}

export function StatusPill({ status }) {
  const tone =
    status === "pass" || status === "ok" || status === "healthy" || status === "match"
      ? "badge-success"
      : status === "warn" || status === "degraded" || status === "idle"
        ? "badge-warning"
        : status === "fail" || status === "error" || status === "changed" || status === "missing"
          ? "badge-error"
          : "badge-ghost";
  return <span className={`badge ${tone} badge-sm normal-case`}>{String(status ?? "unknown")}</span>;
}

export function Panel({ title, subtitle, badge, actions, children, note }) {
  return (
    <section className="rounded-box bg-base-100 border border-base-300 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {badge}
        </div>
        {actions}
      </header>
      {subtitle ? <p className="text-sm opacity-70 mb-3">{subtitle}</p> : null}
      {children}
      {note ? <p className="text-xs opacity-60 mt-3">{note}</p> : null}
    </section>
  );
}

export function Metric({ label, value, hint, tone }) {
  const display = value === null || value === undefined ? "—" : typeof value === "number" ? value.toLocaleString() : value;
  return (
    <div className={`rounded-box border p-3 ${tone === "bad" ? "border-error" : tone === "warn" ? "border-warning" : "border-base-300"}`}>
      <div className="text-xs opacity-60">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{display}</div>
      {hint ? <div className="text-xs opacity-60">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({ message }) {
  return (
    <div className="rounded-box border border-dashed border-base-300 p-4 text-sm opacity-70" data-testid="empty-state">
      {message || "No data in this window."}
    </div>
  );
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return (
    <div role="alert" className="alert alert-error mb-3 text-sm" data-testid="panel-error">
      <span>{error}</span>
      {onRetry ? (
        <button type="button" className="btn btn-xs btn-ghost" onClick={onRetry}>
          <ArrowsClockwiseIcon aria-hidden />
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function LoadingNote() {
  return <div className="text-sm opacity-60">Loading…</div>;
}

export function NotCapturedList({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3">
      <h3 className="text-sm font-medium mb-1">Not measured (and why)</h3>
      <ul className="text-xs space-y-1 opacity-80">
        {items.map((item) => (
          <li key={item.metric}>
            <span className="font-medium">{item.metric}:</span> {item.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DataTable({ columns, rows, empty = "No rows." }) {
  if (!rows?.length) return <EmptyState message={empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="table table-xs table-zebra">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.key || row.name || row.eventId || row.path || index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : formatCell(row[column.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function formatCell(value) {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function KeyValue({ items }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between gap-2 border-b border-base-200 py-1">
          <dt className="opacity-70">{item.label}</dt>
          <dd className="font-medium text-right tabular-nums">{formatCell(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CountList({ title, counts, limit = 12 }) {
  const entries = Object.entries(counts || {}).slice(0, limit);
  if (!entries.length) return <EmptyState message={`${title}: none recorded in this window.`} />;
  const max = Math.max(...entries.map(([, value]) => value), 1);
  return (
    <ul className="space-y-1">
      {entries.map(([key, value]) => (
        <li key={key} className="flex items-center gap-2 text-sm">
          <span className="w-40 truncate" title={key}>
            {key}
          </span>
          <span className="flex-1 bg-base-200 rounded h-3">
            <span className="block h-3 rounded bg-primary" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
          </span>
          <span className="tabular-nums w-12 text-right">{value}</span>
        </li>
      ))}
    </ul>
  );
}
