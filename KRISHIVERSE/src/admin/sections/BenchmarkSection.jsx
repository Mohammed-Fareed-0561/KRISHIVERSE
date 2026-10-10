import React, { useMemo, useState } from 'react';
import { useAdminData } from "../useAdminData";
import { DataTable, EmptyState, ErrorNote, EvalBadge, KeyValue, LoadingNote, Metric, Panel } from "../components/ui";

const TABS = [
  { key: "chatbot", label: "Chatbot arms" },
  { key: "rag", label: "Retrieval" },
  { key: "conditionalrag", label: "Retrieval gating §8" },
  { key: "decision", label: "Decision" },
  { key: "needle", label: "Needle" },
  { key: "laya", label: "Laya" },
  { key: "grounding", label: "Grounding" },
  { key: "safety", label: "Safety" },
  { key: "ablation", label: "Ablation §40" },
  { key: "offline", label: "Offline §20" },
  { key: "mobile", label: "Mobile" },
  { key: "utility", label: "Utility §41" },
  { key: "memory", label: "Memory" },
  { key: "latency", label: "Latency" },
  { key: "models", label: "Model registry" },
  { key: "datasets", label: "Dataset registry" },
  { key: "cropdoctor", label: "Crop Doctor" },
  { key: "imagequality", label: "Image quality" },
];

const RECOMMENDATION_TONE = {
  ADOPT: "badge-success",
  PILOT: "badge-info",
  "KEEP AS FALLBACK": "badge-warning",
  REJECT: "badge-error",
  "NEEDS MORE DATA": "badge-ghost",
};

function formatValue(value) {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ") || "—";
  }
  return String(value);
}

function flattenMetrics(arm) {
  const items = [];
  for (const [key, value] of Object.entries(arm.metrics || {})) {
    if (value === null || value === undefined || key === "failures") continue;
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
      items.push({ label: key, value: typeof value === "number" && value <= 1 && key.includes("Rate") ? `${Math.round(value * 100)}%` : String(value) });
    } else if (key === "overall" && typeof value === "object") {
      items.push(...Object.entries(value).map(([k, v]) => ({ label: k, value: formatValue(v) })));
    } else if (key === "wilsonCi95" && Array.isArray(value)) {
      items.push({ label: "Wilson 95% CI", value: `${Math.round(value[0] * 1000) / 10}% – ${Math.round(value[1] * 1000) / 10}%` });
    }
  }
  return items;
}

function ExtraBlocks({ result }) {
  const blocks = [];

  if (Array.isArray(result.offlineMatrix)) {
    blocks.push(
      <div key="offlineMatrix">
        <h3 className="text-sm font-medium mb-1">Offline matrix OFF-01..20 (§20)</h3>
        <DataTable
          columns={[
            { key: "ref", label: "Ref" },
            { key: "id", label: "Scenario" },
            { key: "state", label: "State", render: (row) => (
              <span className={`badge badge-xs ${row.ok ? "badge-success" : row.state === "skipped" ? "badge-warning" : "badge-error"}`}>
                {row.state === "skipped" ? "NOT MEASURED" : row.ok ? "pass" : "fail"}
              </span>
            ) },
            { key: "env", label: "Environment", render: (row) => <span className="text-xs opacity-70">{row.env}</span> },
            { key: "actual", label: "Expected → actual", render: (row) => <span className="text-xs">{row.state === "skipped" ? (row.skipReason || "—") : `${row.expected} → ${row.actual}`}</span> },
            { key: "howToRun", label: "How to run", render: (row) => <span className="text-xs opacity-70">{row.howToRun || "—"}</span> },
          ]}
          rows={result.offlineMatrix.map((row) => ({ ...row, key: row.ref }))}
        />
      </div>,
    );
  }

  if (Array.isArray(result.ablationTable)) {
    blocks.push(
      <div key="ablationTable">
        <h3 className="text-sm font-medium mb-1">Ablation — one component removed at a time (§40)</h3>
        <DataTable
          columns={[
            { key: "removed", label: "Removed component" },
            { key: "passRate", label: "Pass rate", render: (row) => <span>{row.passRate}</span> },
            { key: "deltaPassRate", label: "Delta", render: (row) => <span className="text-error">−{row.deltaPassRate}</span> },
            { key: "n", label: "n" },
          ]}
          rows={result.ablationTable.map((row, index) => ({ ...row, key: row.id || `${row.removed}-${index}` }))}
        />
      </div>,
    );
  }

  if (Array.isArray(result.datasetRegistry)) {
    blocks.push(
      <div key="datasetRegistry">
        <h3 className="text-sm font-medium mb-1">Dataset registry — sha256 (copied verbatim from runMeta)</h3>
        <DataTable
          columns={[
            { key: "path", label: "Dataset file" },
            { key: "origin", label: "Origin", render: (row) => <span className="text-xs">{row.origin}</span> },
            { key: "usedBy", label: "Used by", render: (row) => <span className="text-xs">{row.usedBy.join(", ")}</span> },
            { key: "sha256", label: "SHA-256", render: (row) => <span className="text-xs opacity-70">{row.sha256.slice(0, 16)}…</span> },
          ]}
          rows={result.datasetRegistry.map((row) => ({ ...row, key: row.path }))}
        />
      </div>,
    );
  }

  if (Array.isArray(result.architectures)) {
    blocks.push(
      <div key="architectures">
        <h3 className="text-sm font-medium mb-1">Architecture scores (§41 — measured weight {result.measuredWeight ?? "—"}{result.measuredWeight ? "/100" : ""})</h3>
        <DataTable
          columns={[
            { key: "arm", label: "Architecture" },
            { key: "score", label: "Score", render: (row) => <span className="font-medium">{row.score}</span> },
            { key: "verdict", label: "Verdict", render: (row) => <span className="text-xs">{row.verdict || "—"}</span> },
            { key: "quality", label: "Quality dim", render: (row) => <span className="text-xs">{row.dims?.quality ?? "—"}</span> },
          ]}
          rows={result.architectures.map((row, index) => ({ ...row, key: row.arm || `arch-${index}` }))}
        />
        {Array.isArray(result.unmeasuredDimensions) && result.unmeasuredDimensions.length ? (
          <p className="text-xs opacity-70 mt-1">NOT MEASURED (excluded, weights re-normalized): {result.unmeasuredDimensions.join(", ")}</p>
        ) : null}
        {result.before ? (
          <p className="text-xs opacity-70 mt-1">BEFORE anchor: {formatValue(result.before)}</p>
        ) : null}
      </div>,
    );
  }

  if (result.modelCatalog && typeof result.modelCatalog === "object") {
    const candidates = Array.isArray(result.modelCatalog.smallLlmCandidates) ? result.modelCatalog.smallLlmCandidates : [];
    blocks.push(
      <div key="modelCatalog">
        <h3 className="text-sm font-medium mb-1">Model catalog (reference data — not measurements)</h3>
        <ul className="text-xs space-y-1 opacity-80">
          <li>Small-LLM candidates: {candidates.length ? candidates.map((c) => `${c.name || c.id || "?"} (${c.size || c.params || "n/a"})`).join(", ") : "—"}</li>
          <li>WebGPU tiers: {(result.modelCatalog.onDeviceWebGpuTiers || []).join(", ") || "—"}</li>
          <li>{result.modelCatalog.note || ""}</li>
        </ul>
      </div>,
    );
  }

  if (result.savings && typeof result.savings === "object") {
    blocks.push(
      <div key="savings">
        <h3 className="text-sm font-medium mb-1">Gating savings vs ALWAYS retrieval (§8)</h3>
        <KeyValue items={Object.entries(result.savings).map(([k, v]) => ({ label: k, value: formatValue(v) }))} />
      </div>,
    );
  }

  if (typeof result.criticalSafetyFailure === "boolean") {
    blocks.push(
      <div key="criticalSafetyFailure">
        <h3 className="text-sm font-medium mb-1">Critical safety failure</h3>
        <span className={`badge badge-sm normal-case ${result.criticalSafetyFailure ? "badge-error" : "badge-success"}`}>
          {result.criticalSafetyFailure ? "CRITICAL FAILURE — NO-GO trigger" : "none (19/19 invariants held)"}
        </span>
      </div>,
    );
  }

  if (Array.isArray(result.checks) && result.checks.length) {
    blocks.push(
      <div key="checks">
        <h3 className="text-sm font-medium mb-1">Safety checks ({result.checks.length})</h3>
        <DataTable
          columns={[
            { key: "id", label: "Check" },
            { key: "expected", label: "Expected" },
            { key: "actual", label: "Actual" },
            { key: "ok", label: "Result", render: (row) => (
              <span className={`badge badge-xs ${row.ok ? "badge-success" : "badge-error"}`}>{row.ok ? "pass" : "FAIL"}</span>
            ) },
          ]}
          rows={result.checks.map((row, index) => ({ ...row, key: row.id || `check-${index}` }))}
        />
      </div>,
    );
  }

  if (Array.isArray(result.scenarios) && result.scenarios.length) {
    blocks.push(
      <div key="scenarios">
        <h3 className="text-sm font-medium mb-1">Connectivity probe scenarios</h3>
        <DataTable
          columns={[
            { key: "id", label: "Scenario" },
            { key: "expected", label: "Expected" },
            { key: "actual", label: "Actual" },
            { key: "ok", label: "Result", render: (row) => (
              <span className={`badge badge-xs ${row.ok ? "badge-success" : "badge-error"}`}>{row.ok ? "pass" : "FAIL"}</span>
            ) },
          ]}
          rows={result.scenarios.map((row, index) => ({ ...row, key: row.id || `scenario-${index}` }))}
        />
      </div>,
    );
  }

  return <>{blocks}</>;
}

export default function BenchmarkSection() {
  const { data, error, loading, refresh } = useAdminData("/benchmarks", { intervalMs: 60000 });
  const [active, setActive] = useState("chatbot");

  const results = data?.results || {};
  const result = results[active];
  const arms = useMemo(() => (Array.isArray(result?.arms) ? result.arms : []), [result]);
  const matrix = data?.decisionMatrix;

  if (loading && !data) return <LoadingNote />;
  if (!data) return <ErrorNote error={error} onRetry={refresh} />;

  return (
    <div className="space-y-4">
      <ErrorNote error={error} onRetry={refresh} />
      <Panel
        title="Rice mobile AI benchmark"
        badge={<EvalBadge />}
        subtitle={data.methodology}
        note={`Generated ${data.generatedAt}`}
      >
        <div className="flex flex-wrap gap-1 mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`btn btn-xs ${active === tab.key ? "btn-primary" : "btn-outline"}`}
              onClick={() => setActive(tab.key)}
            >
              {tab.label}
              {!results[tab.key]?.available ? " ✕" : ""}
            </button>
          ))}
        </div>

        {!result ? (
          <EmptyState message="Unknown benchmark." />
        ) : !result.available ? (
          <EmptyState message={result.reason} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="badge badge-warning badge-sm normal-case">{result.label}</span>
              <span className="opacity-70">origin: {result.origin}</span>
              <span className="opacity-70">run: {result.benchmarkId}</span>
              <span className="opacity-70">date: {result.generatedAt}</span>
              <span className="opacity-70">commit: {result.gitCommit}</span>
              <span className="opacity-70">seed: {result.seed}</span>
            </div>

            <p className="text-sm font-medium">{result.title}</p>

            <div>
              <h3 className="text-sm font-medium mb-1">Arms ({arms.length})</h3>
              <DataTable
                columns={[
                  { key: "id", label: "Arm" },
                  { key: "state", label: "State", render: (row) => (
                    <span className={`badge badge-xs ${row.state === "measured" ? "badge-success" : row.state === "skipped" ? "badge-warning" : "badge-ghost"}`}>
                      {row.state}
                    </span>
                  ) },
                  { key: "headline", label: "Headline / skip reason", render: (row) => (
                    <span className="text-xs">{row.state === "measured" ? formatValue(row.metrics?.overall) || "measured" : row.skipReason}</span>
                  ) },
                  { key: "latency", label: "Latency", render: (row) => (
                    <span className="text-xs">{row.latencyMs ? formatValue(row.latencyMs) : "—"}</span>
                  ) },
                ]}
                rows={arms}
              />
            </div>

            {arms.filter((arm) => arm.state === "measured").map((arm) => {
              const items = flattenMetrics(arm);
              if (!items.length) return null;
              return (
                <div key={arm.id}>
                  <h3 className="text-sm font-medium mb-1">Measured metrics — {arm.id}</h3>
                  <KeyValue items={items} />
                </div>
              );
            })}

            <ExtraBlocks result={result} />

            {Array.isArray(result.derivedFrom) && result.derivedFrom.length ? (
              <p className="text-xs opacity-70">Derived from: {result.derivedFrom.join(", ")}</p>
            ) : null}

            {Array.isArray(result.safetyHardFailures) && result.safetyHardFailures.length ? (
              <div>
                <h3 className="text-sm font-medium mb-1">Hard safety failures (must stay empty)</h3>
                <DataTable
                  columns={[{ key: "id", label: "Case" }, { key: "expected", label: "Expected" }, { key: "actual", label: "Actual" }]}
                  rows={result.safetyHardFailures}
                />
              </div>
            ) : null}

            {Array.isArray(result.safetyAdvisoryFindings) && result.safetyAdvisoryFindings.length ? (
              <div>
                <h3 className="text-sm font-medium mb-1">Advisory safety findings (report-only gaps)</h3>
                <DataTable
                  columns={[
                    { key: "id", label: "Case" },
                    { key: "expected", label: "Expected" },
                    { key: "actual", label: "Actual" },
                    { key: "reasons", label: "Validator reasons", render: (row) => <span className="text-xs">{(row.reasons || []).join("; ") || "—"}</span> },
                  ]}
                  rows={result.safetyAdvisoryFindings}
                />
              </div>
            ) : null}

            {result.taskBreakdown?.notMeasuredHere ? (
              <div>
                <h3 className="text-sm font-medium mb-1">Not measured here</h3>
                <ul className="text-xs space-y-1 opacity-80">
                  {Object.entries(result.taskBreakdown.notMeasuredHere).map(([metric, reason]) => (
                    <li key={metric}>
                      <span className="font-medium">{metric}:</span> {reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <h3 className="text-sm font-medium mb-1">Limitations</h3>
              <ul className="text-xs space-y-1 opacity-80">
                {(result.limitations || []).map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Decision matrix" badge={<EvalBadge />} subtitle="§23 vocabulary — null means not measured, never invented">
        {matrix?.rows?.length ? (
          <DataTable
            columns={[
              { key: "technology", label: "Technology" },
              { key: "role", label: "Role" },
              { key: "recommendation", label: "Recommendation", render: (row) => (
                <span className={`badge badge-sm normal-case ${RECOMMENDATION_TONE[row.recommendation] || "badge-ghost"}`}>{row.recommendation}</span>
              ) },
              { key: "quality", label: "Quality", render: (row) => <span className="text-xs">{row.quality ?? "—"}</span> },
              { key: "offline", label: "Offline", render: (row) => <span className="text-xs">{row.offline ?? "—"}</span> },
              { key: "evidence", label: "Evidence", render: (row) => <span className="text-xs opacity-70">{row.evidence}</span> },
            ]}
            rows={matrix.rows.map((row, index) => ({ ...row, id: `${row.technology}-${index}` }))}
          />
        ) : (
          <EmptyState message={data.unavailablePanels?.some((p) => p.name === "decision-matrix")
            ? data.unavailablePanels.find((p) => p.name === "decision-matrix").reason
            : "No decision matrix built yet — run `npm run eval:mobile-ai`."} />
        )}
      </Panel>

      <Panel title="Cross-benchmark comparison" badge={<EvalBadge />} subtitle={data.comparison?.readingNote}>
        {data.comparison?.sources?.length ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Metric label="benchmarks" value={data.comparison.sources.length} />
              <Metric label="measured arms" value={data.comparison.armTotals?.measured ?? "—"} />
              <Metric label="skipped arms" value={data.comparison.armTotals?.skipped ?? "—"} />
              <Metric label="git commit" value={(data.comparison.gitCommit || "—").slice(0, 10)} />
            </div>
            <DataTable
              columns={[
                { key: "file", label: "Result file" },
                { key: "origin", label: "Origin" },
                { key: "arms", label: "Arms", render: (row) => <span className="text-xs">{row.arms.map((arm) => `${arm.id} (${arm.state})`).join(", ")}</span> },
                { key: "sha256", label: "SHA-256", render: (row) => <span className="text-xs opacity-70">{row.sha256.slice(0, 12)}…</span> },
              ]}
              rows={data.comparison.sources.map((source) => ({ ...source, id: source.file }))}
            />
            <div>
              <h3 className="text-sm font-medium mb-1">Union of stated limitations</h3>
              <ul className="text-xs space-y-1 opacity-80">
                {(data.comparison.limitations || []).map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <EmptyState message="No comparison built yet — run `npm run eval:mobile-ai`." />
        )}
      </Panel>
    </div>
  );
}
