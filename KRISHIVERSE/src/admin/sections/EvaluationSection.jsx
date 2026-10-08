import React, { useMemo, useState } from "react";
import { useAdminData } from "../useAdminData";
import { LatencyBars } from "../components/charts";
import { CountList, DataTable, EmptyState, ErrorNote, EvalBadge, KeyValue, LoadingNote, Metric, Panel } from "../components/ui";

const DATASETS = [
  { key: "retrieval", label: "RAG retrieval" },
  { key: "safety", label: "Safety" },
  { key: "provenance", label: "Provenance" },
  { key: "chatbot", label: "Chatbot" },
  { key: "multilingual", label: "Multilingual" },
  { key: "grounding", label: "Grounding" },
  { key: "cropdoctor", label: "Crop Doctor" },
  { key: "joint-rag", label: "Joint RAG A/B" },
];

function flattenMetrics(metrics) {
  const items = [];
  for (const [key, value] of Object.entries(metrics || {})) {
    if (value === null || value === undefined) continue;
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
      items.push({ label: key, value });
    } else if (key === "latency" && typeof value === "object") {
      for (const stat of ["count", "avg", "p50", "p95", "p99", "max"]) {
        if (value[stat] !== null && value[stat] !== undefined) items.push({ label: `latency ${stat}`, value: `${value[stat]} ms` });
      }
    } else if (key === "categories" && typeof value === "object") {
      items.push({ label: "categories", value: Object.entries(value).map(([name, count]) => `${name}: ${count}`).join(", ") });
    } else if (key === "onnxWilson95" && Array.isArray(value)) {
      items.push({ label: "ONNX Wilson 95% CI", value: `${Math.round(value[0] * 1000) / 10}% – ${Math.round(value[1] * 1000) / 10}%` });
    }
  }
  return items;
}

export default function EvaluationSection() {
  const { data, error, loading, refresh } = useAdminData("/evaluation", { intervalMs: 60000 });
  const [active, setActive] = useState("retrieval");
  const [language, setLanguage] = useState("all");
  const [topic, setTopic] = useState("all");

  const datasets = data?.datasets || {};
  const dataset = datasets[active];
  const metricItems = useMemo(() => flattenMetrics(dataset?.metrics), [dataset]);

  const rows = useMemo(() => {
    if (active === "retrieval" && data?.datasets?.retrieval?.rows) {
      return data.datasets.retrieval.rows;
    }
    return null;
  }, [active, data]);

  if (loading && !data) return <LoadingNote />;
  if (!data) return <ErrorNote error={error} onRetry={refresh} />;

  return (
    <div className="space-y-4">
      <ErrorNote error={error} onRetry={refresh} />
      <Panel
        title="Evaluation dashboard"
        badge={<EvalBadge />}
        subtitle={data.methodology}
        note={`Generated ${data.generatedAt}`}
      >
        <div className="flex flex-wrap gap-1 mb-4">
          {DATASETS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className={`btn btn-xs ${active === entry.key ? "btn-primary" : "btn-outline"}`}
              onClick={() => setActive(entry.key)}
            >
              {entry.label}
              {!datasets[entry.key]?.available ? " ✕" : ""}
            </button>
          ))}
        </div>

        {!dataset ? (
          <EmptyState message="Unknown dataset." />
        ) : !dataset.available ? (
          <EmptyState message={dataset.reason} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="badge badge-warning badge-sm normal-case">{dataset.label}</span>
              <span className="opacity-70">origin: {dataset.origin}</span>
              <span className="opacity-70">generated: {dataset.generatedAt}</span>
              <span className="opacity-70">dataset size: {dataset.datasetSize}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metricItems.slice(0, 8).map((item) => (
                <Metric key={item.label} label={item.label} value={item.value} />
              ))}
            </div>

            {metricItems.length > 8 ? (
              <KeyValue items={metricItems.slice(8)} />
            ) : null}

            {dataset.metrics?.latency?.count ? <LatencyBars latency={dataset.metrics.latency} /> : null}

            {active === "retrieval" ? (
              <div className="flex flex-wrap gap-2 items-center">
                <label className="text-sm" htmlFor="eval-language">
                  Language
                </label>
                <select id="eval-language" className="select select-bordered select-xs" value={language} onChange={(event) => setLanguage(event.target.value)}>
                  <option value="all">all</option>
                  {(dataset.facets?.languages || []).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <label className="text-sm" htmlFor="eval-topic">
                  Topic
                </label>
                <select id="eval-topic" className="select select-bordered select-xs" value={topic} onChange={(event) => setTopic(event.target.value)}>
                  <option value="all">all</option>
                  {(dataset.facets?.topics || []).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <span className="text-xs opacity-60">date range: {dataset.generatedAt}</span>
              </div>
            ) : null}

            {dataset.facets?.byLanguage ? (
              <div>
                <h3 className="text-sm font-medium mb-1">Language breakdown</h3>
                <DataTable
                  columns={[
                    { key: "language", label: "Language" },
                    { key: "n", label: "n" },
                    { key: "pass", label: "pass", render: (row) => (row.pass ?? row.recallAt1 ?? "—") },
                  ]}
                  rows={Object.entries(dataset.facets.byLanguage).map(([languageKey, values]) => ({ language: languageKey, ...values, id: languageKey }))}
                />
              </div>
            ) : null}

            {dataset.facets?.byTopic ? (
              <div>
                <h3 className="text-sm font-medium mb-1">Topic breakdown</h3>
                <DataTable
                  columns={[
                    { key: "topic", label: "Topic" },
                    { key: "n", label: "n" },
                    { key: "recallAt1", label: "R@1" },
                    { key: "recallAt3", label: "R@3" },
                    { key: "recallAt5", label: "R@5" },
                    { key: "mrr", label: "MRR" },
                  ]}
                  rows={Object.entries(dataset.facets.byTopic).map(([topicKey, values]) => ({ topic: topicKey, ...values, id: topicKey }))}
                />
              </div>
            ) : null}

            {Array.isArray(rows) && rows.length ? (
              <div>
                <h3 className="text-sm font-medium mb-1">Per-query results (filterable)</h3>
                <DataTable
                  columns={[
                    { key: "id", label: "Case" },
                    { key: "language", label: "Language" },
                    { key: "topic", label: "Topic" },
                    { key: "rank", label: "Rank" },
                    { key: "ms", label: "ms" },
                  ]}
                  rows={rows.filter(
                    (row) => (language === "all" || row.language === language) && (topic === "all" || row.topic === topic),
                  )}
                />
              </div>
            ) : null}

            {dataset.unavailableMetrics?.length ? (
              <div>
                <h3 className="text-sm font-medium mb-1">Metrics that are not measurable</h3>
                <ul className="text-xs space-y-1">
                  {dataset.unavailableMetrics.map((item) => (
                    <li key={item.metric}>
                      <span className="font-medium">{item.metric}:</span> {item.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {dataset.failures?.length ? (
              <div>
                <h3 className="text-sm font-medium mb-1">Failure examples</h3>
                <DataTable
                  columns={[
                    { key: "id", label: "Case" },
                    { key: "language", label: "Language" },
                    { key: "topic", label: "Topic" },
                    { key: "rank", label: "Rank" },
                  ]}
                  rows={dataset.failures}
                />
              </div>
            ) : null}

            <div>
              <h3 className="text-sm font-medium mb-1">Methodology limitations</h3>
              <ul className="text-xs space-y-1 opacity-80">
                {(dataset.limitations || []).map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-4">
          <h3 className="text-sm font-medium mb-1">Panels that stay unavailable</h3>
          <ul className="text-xs space-y-1 opacity-80">
            {(data.unavailablePanels || []).map((panel) => (
              <li key={panel.name}>
                <span className="font-medium">{panel.name}:</span> {panel.reason}
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel title="Retrieval failures (R@5 misses)" badge={<EvalBadge />}>
        {datasets.retrieval?.failures?.length ? (
          <DataTable
            columns={[
              { key: "id", label: "Case" },
              { key: "language", label: "Language" },
              { key: "topic", label: "Topic" },
              { key: "rank", label: "Rank" },
              { key: "latencyMs", label: "ms" },
            ]}
            rows={datasets.retrieval.failures}
          />
        ) : (
          <EmptyState message={datasets.retrieval?.available ? "No misses at K=5 in the last run." : datasets.retrieval?.reason} />
        )}
      </Panel>

      <Panel title="Uncovered topics" badge={<EvalBadge />}>
        <CountList title="Uncovered" counts={Object.fromEntries((datasets.retrieval?.uncoveredTopics || []).map((value) => [value, 1]))} />
      </Panel>
    </div>
  );
}
