import React, { useState } from "react";
import { useAdminData } from "../useAdminData";
import { adminPost, can } from "../adminApi";
import { useAdminSession } from "../sessionContext";
import { DataTable, ErrorNote, KeyValue, LoadingNote, Panel, ProdBadge, StatusPill } from "../components/ui";

export default function RegistrySection() {
  const { permissions } = useAdminSession();
  const datasets = useAdminData("/registry/datasets", { intervalMs: 60000 });
  const models = useAdminData("/registry/models", { intervalMs: 60000 });
  const deps = useAdminData("/registry/dependencies", { intervalMs: 60000 });
  const [form, setForm] = useState({ kind: "dataset", key: "", name: "", origin: "" });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const mayEdit = can(permissions, "admin:config");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await adminPost("/registry", { kind: form.kind, key: form.key.trim(), name: form.name.trim(), origin: form.origin.trim() });
      setMessage({ ok: true, text: `Saved ${form.kind}:${form.key}` });
      setForm({ ...form, key: "", name: "", origin: "" });
      await datasets.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err?.message || "Save failed" });
    } finally {
      setBusy(false);
    }
  }

  if (datasets.loading && !datasets.data) return <LoadingNote />;
  if (!datasets.data) return <ErrorNote error={datasets.error} onRetry={datasets.refresh} />;

  return (
    <div className="space-y-4">
      <ErrorNote error={datasets.error} onRetry={datasets.refresh} />
      <ErrorNote error={models.error} />
      <ErrorNote error={deps.error} />

      <Panel title="Dataset registry" badge={<ProdBadge />}>
        <DataTable
          columns={[
            { key: "name", label: "Dataset" },
            { key: "kind", label: "Kind" },
            { key: "available", label: "Available" },
            { key: "size", label: "Size" },
            { key: "generatedAt", label: "Generated" },
            { key: "origin", label: "Origin / note" },
          ]}
          rows={datasets.data.datasets || []}
        />
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Model registry" subtitle={models.data?.note}>
          <DataTable
            columns={[
              { key: "name", label: "Provider" },
              { key: "scope", label: "Scope" },
              { key: "configured", label: "Configured" },
            ]}
            rows={models.data?.providers || []}
          />
          <h3 className="text-sm font-medium mt-3 mb-1">Observed in production telemetry</h3>
          <DataTable
            columns={[
              { key: "name", label: "Model" },
              { key: "count", label: "Events" },
              { key: "providers", label: "Providers" },
            ]}
            rows={models.data?.observedInTelemetry || []}
            empty="No model events observed yet."
          />
        </Panel>

        <Panel title="Dependency map">
          <DataTable
            columns={[
              { key: "name", label: "Dependency" },
              { key: "kind", label: "Kind" },
              { key: "required", label: "Required" },
              { key: "configured", label: "Configured" },
              { key: "reachable", label: "Reachable" },
            ]}
            rows={deps.data?.dependencies || []}
          />
          <p className="text-xs opacity-60 mt-1">Probed {deps.data?.generatedAt}</p>
        </Panel>
      </div>

      <Panel title="Register an entry" subtitle="Operator-maintained registry entries (datasets, models, releases, config changes).">
        {!mayEdit ? (
          <p className="text-sm opacity-70">Your role has read-only registry access.</p>
        ) : (
          <form className="grid md:grid-cols-5 gap-2 items-end" onSubmit={submit}>
            <label className="form-control">
              <span className="label-text text-xs">Kind</span>
              <select className="select select-bordered select-sm" value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
                <option value="dataset">dataset</option>
                <option value="model">model</option>
                <option value="release">release</option>
                <option value="configChange">configChange</option>
                <option value="kbChange">kbChange</option>
              </select>
            </label>
            <label className="form-control">
              <span className="label-text text-xs">Key</span>
              <input className="input input-bordered input-sm" value={form.key} required onChange={(event) => setForm({ ...form, key: event.target.value })} placeholder="field-pilot-2026" />
            </label>
            <label className="form-control">
              <span className="label-text text-xs">Name</span>
              <input className="input input-bordered input-sm" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Field pilot photos" />
            </label>
            <label className="form-control">
              <span className="label-text text-xs">Origin / note</span>
              <input className="input input-bordered input-sm" value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value })} placeholder="where it came from" />
            </label>
            <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
              Save
            </button>
          </form>
        )}
        {message ? <p className={`text-xs mt-2 ${message.ok ? "text-success" : "text-error"}`}>{message.text}</p> : null}
      </Panel>
    </div>
  );
}

export function ReadinessSection() {
  const readiness = useAdminData("/readiness", { intervalMs: 60000 });
  const dr = useAdminData("/dr", { intervalMs: 60000 });

  if (readiness.loading && !readiness.data) return <LoadingNote />;
  if (!readiness.data) return <ErrorNote error={readiness.error} onRetry={readiness.refresh} />;

  const card = readiness.data;

  return (
    <div className="space-y-4">
      <ErrorNote error={readiness.error} onRetry={readiness.refresh} />
      <Panel
        title="Readiness scorecard"
        badge={<StatusPill status={card.status} />}
        subtitle={`${card.counts.pass}/${card.counts.total} checks pass · score ${card.scorePct ?? "n/a"}%`}
        note={card.note}
      >
        <DataTable
          columns={[
            { key: "group", label: "Area" },
            { key: "name", label: "Check" },
            { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
            { key: "value", label: "Value" },
            { key: "target", label: "Target" },
            { key: "note", label: "Note" },
          ]}
          rows={card.checks || []}
        />
      </Panel>

      <Panel title="Disaster recovery" badge={<StatusPill status={dr.data?.restoreDrill?.performed ? "pass" : "warn"} />} note={dr.data?.documentedPlan}>
        <ErrorNote error={dr.error} onRetry={dr.refresh} />
        <KeyValue
          items={[
            { label: "RTO target", value: `${dr.data?.targets?.rtoHours ?? "—"} h` },
            { label: "RPO target", value: `${dr.data?.targets?.rpoHours ?? "—"} h` },
            { label: "Backups", value: dr.data?.backups?.count ?? 0 },
            { label: "Latest backup", value: dr.data?.backups?.latest?.backupId || "none" },
            { label: "Backup storage", value: dr.data?.backups?.storage },
            { label: "Restore drill", value: dr.data?.restoreDrill?.performed ? `${dr.data.restoreDrill.backupId} @ ${dr.data.restoreDrill.at}` : dr.data?.restoreDrill?.reason },
            { label: "Critical dependencies", value: dr.data?.dependencies?.critical?.join(", ") },
          ]}
        />
        <p className="text-xs opacity-70 mt-2">{dr.data?.targets?.note}</p>
      </Panel>
    </div>
  );
}
