import React, { useState } from "react";
import { useAdminData } from "../useAdminData";
import { adminGet, adminPost, can } from "../adminApi";
import { useAdminSession } from "../sessionContext";
import { DataTable, ErrorNote, KeyValue, LoadingNote, Panel, StatusPill } from "../components/ui";

export default function BackupSection() {
  const { permissions } = useAdminSession();
  const { data, error, loading, refresh } = useAdminData("/backups", { intervalMs: 60000 });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [drill, setDrill] = useState(null);
  const [verify, setVerify] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const mayBackup = can(permissions, "admin:backup");
  const mayRestore = can(permissions, "admin:rollback");

  async function run(action) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setActionError(err?.message || "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <LoadingNote />;
  if (!data) return <ErrorNote error={error} onRetry={refresh} />;

  return (
    <div className="space-y-4">
      <ErrorNote error={error} onRetry={refresh} />
      <ErrorNote error={actionError} />
      <Panel
        title="Backups"
        badge={<span className="badge badge-ghost badge-sm">secret-free metadata snapshots</span>}
        actions={
          mayBackup ? (
            <button type="button" className="btn btn-xs btn-primary" disabled={busy} onClick={() => run(() => adminPost("/backups"))}>
              Create backup
            </button>
          ) : (
            <span className="badge badge-ghost badge-sm">read-only</span>
          )
        }
        note="Backups snapshot KB manifest, config, package manifests and evaluation results. .env and credentials are never copied."
      >
        <DataTable
          columns={[
            { key: "backupId", label: "Backup" },
            { key: "createdAt", label: "Created" },
            { key: "assetCount", label: "Assets" },
            { key: "totalBytes", label: "Size", render: (row) => `${(row.totalBytes / 1024).toFixed(1)} KB` },
            { key: "gitCommit", label: "Commit", render: (row) => (row.gitCommit ? row.gitCommit.slice(0, 7) : "—") },
            { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <span className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="btn btn-xs"
                    disabled={busy || !mayBackup}
                    onClick={() => run(async () => setVerify(await adminGet(`/backups/${row.backupId}/verify`)))}
                  >
                    Verify
                  </button>
                  <span className="flex items-center gap-1">
                    <label className="label cursor-pointer gap-1 text-xs" htmlFor={`confirm-${row.backupId}`}>
                      <input
                        id={`confirm-${row.backupId}`}
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={confirmId === row.backupId}
                        onChange={(event) => setConfirmId(event.target.checked ? row.backupId : null)}
                      />
                      confirm
                    </label>
                    <button
                      type="button"
                      className="btn btn-xs btn-warning"
                      disabled={busy || !mayRestore || confirmId !== row.backupId}
                      title={mayRestore ? "Restore drill into a scratch directory" : "Superadmin only"}
                      onClick={() =>
                        run(async () => setDrill(await adminPost(`/backups/${row.backupId}/restore`, { confirm: true })))
                      }
                    >
                      Restore drill
                    </button>
                  </span>
                </span>
              ),
            },
          ]}
          rows={data.backups || []}
          empty="No backups yet."
        />

        {!mayRestore ? <p className="text-xs opacity-60 mt-2">Restores require the superadmin role.</p> : null}

        {verify ? (
          <div className="mt-3">
            <h3 className="text-sm font-medium mb-1">Verify — {verify.report.backupId}</h3>
            <DataTable
              columns={[
                { key: "path", label: "Asset" },
                { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
                { key: "bytes", label: "Bytes" },
              ]}
              rows={verify.report.results}
            />
            <p className="text-xs opacity-70 mt-1">
              {verify.report.changed === 0 ? "No drift since backup." : `${verify.report.changed} asset(s) changed since backup.`}
            </p>
          </div>
        ) : null}

        {drill ? (
          <div className="mt-3">
            <h3 className="text-sm font-medium mb-1">Restore drill — {drill.drill.backupId}</h3>
            <KeyValue
              items={[
                { label: "Result", value: drill.drill.ok ? "all assets restored" : "FAILED" },
                { label: "Restored", value: `${drill.drill.restored}/${drill.drill.total}` },
                { label: "Target", value: drill.drill.targetDir },
              ]}
            />
            <p className="text-xs opacity-70 mt-1">{drill.drill.note}</p>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

export function VersionSection() {
  const versions = useAdminData("/versions");
  const changes = useAdminData("/versions/changes?limit=20");
  const kbChanges = useAdminData("/versions/kb-changes?limit=20");
  const configChanges = useAdminData("/versions/config-history?limit=20");

  if (versions.loading && !versions.data) return <LoadingNote />;
  if (!versions.data) return <ErrorNote error={versions.error} onRetry={versions.refresh} />;

  const git = versions.data.git || {};
  const build = versions.data.build || {};

  return (
    <div className="space-y-4">
      <ErrorNote error={versions.error} onRetry={versions.refresh} />
      <Panel title="Version governance" badge={git.available ? <StatusPill status="ok" /> : <StatusPill status="unknown" />} note={versions.data.policy}>
        <KeyValue
          items={[
            { label: "Commit", value: git.available ? git.shortCommit : git.reason },
            { label: "Branch", value: git.branch },
            { label: "Dirty tree", value: git.dirty },
            { label: "Last commit", value: git.lastCommitSubject },
            { label: "Committed at", value: git.lastCommitAt },
            { label: "Author", value: git.author },
            { label: "Backend version", value: build.backend?.version },
            { label: "Frontend version", value: build.frontend?.version },
            { label: "API version", value: build.apiVersion },
            { label: "Environment", value: build.environment },
            { label: "Node", value: build.node },
            { label: "Built dist", value: build.dist ? `${build.dist.modifiedAt} (${build.dist.bytes} bytes)` : "no dist build" },
          ]}
        />
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Source change history">
          {changes.error ? <ErrorNote error={changes.error} onRetry={changes.refresh} /> : (
            <DataTable
              columns={[
                { key: "shortCommit", label: "Commit" },
                { key: "at", label: "When" },
                { key: "author", label: "Author" },
                { key: "subject", label: "Subject" },
              ]}
              rows={changes.data?.entries || []}
              empty={changes.data?.available ? "No commits." : changes.data?.reason}
            />
          )}
        </Panel>

        <Panel title="KB change history">
          {kbChanges.error ? <ErrorNote error={kbChanges.error} onRetry={kbChanges.refresh} /> : (
            <>
              {kbChanges.data?.current?.available ? (
                <div className="mb-2 text-xs opacity-70">
                  Current KB: v{kbChanges.data.current.version} · {kbChanges.data.current.counts?.total} records · generated {kbChanges.data.current.generatedAt}
                </div>
              ) : null}
              <DataTable
                columns={[
                  { key: "shortCommit", label: "Commit" },
                  { key: "at", label: "When" },
                  { key: "subject", label: "Subject" },
                ]}
                rows={kbChanges.data?.git?.entries || []}
                empty={kbChanges.data?.git?.available ? "No KB commits." : kbChanges.data?.git?.reason}
              />
            </>
          )}
        </Panel>
      </div>

      <Panel title="Configuration change history" note={configChanges.data?.note}>
        {configChanges.error ? <ErrorNote error={configChanges.error} onRetry={configChanges.refresh} /> : (
          <>
            <div className="mb-2 text-xs opacity-70">Tracked paths: {(configChanges.data?.trackedPaths || []).join(", ")}</div>
            <DataTable
              columns={[
                { key: "shortCommit", label: "Commit" },
                { key: "at", label: "When" },
                { key: "author", label: "Author" },
                { key: "subject", label: "Subject" },
              ]}
              rows={configChanges.data?.git?.entries || []}
              empty={configChanges.data?.git?.available ? "No config commits." : configChanges.data?.git?.reason}
            />
          </>
        )}
      </Panel>
    </div>
  );
}
