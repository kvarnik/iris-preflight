import { useEffect, useMemo, useState } from "react";
import { PreviewPanel } from "../components/PreviewPanel";
import { ParamForm } from "../components/ParamForm";
import { JsonBlock } from "../components/JsonBlock";
import { DiffView } from "../components/DiffView";
import { adminCall, buildUrl } from "../lib/api";
import { getReadPair, inventory, searchOperations } from "../lib/inventory";
import { persistEntry, updateEntry } from "../lib/journal";
import { previewOperation, privilegesFromInfo, privilegesFromRoleResources } from "../lib/privileges";
import { getSession } from "../lib/auth";
import { fieldClass } from "../lib/theme";
import type { Job, JournalEntry, Operation } from "../lib/types";

type RoleOption = { Name?: string; name?: string };

type Props = {
  writeEnabled: boolean;
  onJob: (job: Job) => void;
  onJournal: (entry: JournalEntry) => void;
};

export function Explorer({ writeEnabled, onJob, onJournal }: Props) {
  const session = getSession();
  const held = useMemo(() => (session ? privilegesFromInfo(session.info) : new Set<string>()), [session]);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [risk, setRisk] = useState("");
  const [selectedId, setSelectedId] = useState(inventory.operations[0]?.id || "");
  const [params, setParams] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [roleName, setRoleName] = useState("");
  const [simulated, setSimulated] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [before, setBefore] = useState<unknown>(null);
  const [after, setAfter] = useState<unknown>(null);
  const [entryId, setEntryId] = useState<string | number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const operations = useMemo(() => searchOperations(query, tag, risk), [query, tag, risk]);
  const selected = inventory.operations.find((op) => op.id === selectedId) || operations[0];
  const preview = selected ? previewOperation(selected, held, simulated) : null;
  const readPair = selected ? getReadPair(selected) : undefined;

  useEffect(() => {
    if (!selected) return;
    const next: Record<string, string> = {};
    for (const parameter of selected.parameters) {
      if (parameter.default != null && parameter.default !== "") {
        next[parameter.name] = String(parameter.default);
      }
    }
    setParams(next);
    setBodyText(selected.requestBody ? "{\n  \n}" : "");
    setResult(null);
    setBefore(null);
    setAfter(null);
    setEntryId(null);
    setMessage(null);
    setConfirming(false);
    setStatus(null);
  }, [selected?.id]);

  useEffect(() => {
    if (!held.has("%Admin_Secure:U")) return;
    adminCall("GET", "/v2/security/roles?maxRows=200")
      .then((res) => {
        const list = Array.isArray(res.envelope?.result) ? res.envelope?.result : [];
        const names = (list as RoleOption[])
          .map((row) => row.Name || row.name)
          .filter((name): name is string => Boolean(name));
        setRoles(names);
      })
      .catch(() => undefined);
  }, [held]);

  async function applyRole(name: string) {
    setRoleName(name);
    if (!name) {
      setSimulated(null);
      return;
    }
    const res = await adminCall("GET", `/v2/security/role?name=${encodeURIComponent(name)}`);
    const role = res.envelope?.result as { Resources?: { Name?: string; Permissions?: string }[] } | undefined;
    if (name === "%All") {
      setSimulated(new Set(inventory.privileges.map((privilege) => privilege.name)));
      return;
    }
    const extra = privilegesFromRoleResources(role?.Resources);
    setSimulated(extra);
  }

  async function snapshotBefore(op: Operation): Promise<unknown> {
    if (!readPair || readPair.id === op.id) return null;
    const url = buildUrl(readPair, params);
    const res = await adminCall("GET", url);
    return res.envelope?.result ?? res.raw;
  }

  async function execute() {
    if (!selected || !preview) return;
    if (selected.risk !== "read" && !writeEnabled) {
      setMessage("Read-only mode. Enable writes to run this operation.");
      return;
    }
    if (selected.risk === "destructive" && !confirming) {
      setConfirming(true);
      setMessage("Destructive call. Confirm again to execute.");
      return;
    }
    const missing = selected.parameters
      .filter((parameter) => parameter.required && !(params[parameter.name] ?? "").trim())
      .map((parameter) => parameter.name);
    if (missing.length) {
      setMessage(`Required ${missing.length === 1 ? "parameter" : "parameters"}: ${missing.join(", ")}`);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const snap = selected.risk === "read" ? null : await snapshotBefore(selected);
      setBefore(snap);
      let body: unknown;
      if (selected.requestBody) {
        body = bodyText.trim() ? JSON.parse(bodyText) : {};
      }
      const url = buildUrl(selected, params);
      const res = await adminCall(selected.method, url, body);
      setStatus(res.status);
      setResult(res.raw);
      if (res.privilegeDenied) {
        setMessage(`403 privilege result: ${res.error}`);
      } else if (res.error) {
        setMessage(res.error);
      }
      let verify: unknown = null;
      if (res.ok && readPair && selected.risk !== "read") {
        const afterRes = await adminCall("GET", buildUrl(readPair, params));
        verify = afterRes.envelope?.result ?? afterRes.raw;
        setAfter(verify);
      }
      const entry: JournalEntry = {
        type: snap ? "snapshot" : "journal",
        operationId: selected.id,
        method: selected.method,
        path: selected.path,
        url,
        risk: selected.risk,
        httpStatus: res.status,
        asyncTaskGUID: res.asyncTaskGUID || undefined,
        error: res.error || undefined,
        params,
        body,
        before: snap,
        after: verify,
      };
      try {
        const saved = await persistEntry(entry);
        setEntryId(saved.id ?? null);
        onJournal(saved);
      } catch {
        onJournal(entry);
      }
      if (res.asyncTaskGUID) {
        onJob({
          guid: res.asyncTaskGUID,
          operationId: selected.id,
          startedAt: new Date().toISOString(),
          status: "queued",
          location: res.location || undefined,
        });
        setMessage(`Accepted. Tracking async task ${res.asyncTaskGUID}`);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Call failed");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  async function rollback() {
    if (!selected || before == null) return;
    if (!writeEnabled) {
      setMessage("Enable writes to roll back.");
      return;
    }
    const inverseMethod = selected.method === "DELETE" ? "PUT" : selected.method === "PUT" ? "PUT" : "";
    if (!inverseMethod) {
      setMessage("This operation has no automatic rollback (action POST). Restore from the snapshot JSON manually.");
      return;
    }
    setBusy(true);
    try {
      const url = buildUrl(selected, params);
      const res = await adminCall(inverseMethod, url, before);
      setStatus(res.status);
      setResult(res.raw);
      if (readPair) {
        const afterRes = await adminCall("GET", buildUrl(readPair, params));
        setAfter(afterRes.envelope?.result ?? afterRes.raw);
      }
      if (entryId != null) {
        const saved = await updateEntry(entryId, { rolledBack: true });
        onJournal(saved);
      }
      setMessage(res.ok ? "Rolled back from pre-write snapshot." : res.error);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Rollback failed");
    } finally {
      setBusy(false);
    }
  }

  if (!selected || !preview) return null;

  return (
    <div className="grid h-full grid-cols-[320px_1fr] gap-0 bg-surface">
      <aside className="flex h-full flex-col border-r border-line bg-surface-raised">
        <div className="space-y-2 border-b border-line p-3">
          <input
            className={fieldClass}
            placeholder="Search 276 operations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className={fieldClass}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            <option value="">All tags</option>
            {inventory.tags.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name} ({item.operationCount})
              </option>
            ))}
          </select>
          <select
            className={fieldClass}
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
          >
            <option value="">All risks</option>
            <option value="read">read</option>
            <option value="mutating">mutating</option>
            <option value="destructive">destructive</option>
          </select>
        </div>
        <ul className="min-h-0 flex-1 overflow-auto p-2">
          {operations.map((op) => (
            <li key={op.id}>
              <button
                onClick={() => setSelectedId(op.id)}
                className={`mb-1 w-full rounded-lg px-2 py-2 text-left ${
                  op.id === selected.id ? "bg-iris/15" : "hover:bg-surface-input"
                }`}
              >
                <div className="font-mono text-xs text-iris">
                  {op.method} {op.path}
                </div>
                <div className="truncate text-xs text-ink-muted">{op.summary}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="min-h-0 overflow-auto p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-sm text-iris">
              {selected.method} {selected.path}
            </div>
            <h1 className="text-xl font-semibold">{selected.summary}</h1>
            <p className="text-sm text-ink-muted">{selected.tag}</p>
          </div>
          <label className="text-sm text-ink-muted">
            Simulate role
            <select
              className={`mt-1 block ${fieldClass}`}
              value={roleName}
              onChange={(e) => applyRole(e.target.value)}
            >
              <option value="">(none — my privileges)</option>
              {roles.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <PreviewPanel preview={preview} risk={selected.risk} writeEnabled={writeEnabled} asyncOp={selected.async} />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface-raised p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Parameters</h2>
            <ParamForm
              operation={selected}
              values={params}
              onChange={(name, value) => setParams((current) => ({ ...current, [name]: value }))}
            />
          </div>
          <div className="rounded-xl border border-line bg-surface-raised p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Body {selected.requestBody ? `(${selected.requestBody})` : "(none)"}
            </h2>
            {selected.requestBody ? (
              <textarea
                className={`h-48 ${fieldClass}`}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
              />
            ) : (
              <p className="text-sm text-ink-muted">This operation has no request body.</p>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={execute}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              confirming ? "bg-danger" : "bg-iris hover:bg-iris-hover"
            }`}
          >
            {busy ? "Running…" : confirming ? "Confirm destructive execute" : "Execute"}
          </button>
          <button
            onClick={rollback}
            disabled={busy || before == null}
            className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-raised disabled:opacity-40"
          >
            Roll back snapshot
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-warn">{message}</p> : null}
        {status != null ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                Result · HTTP {status}
              </h2>
              <JsonBlock value={result} className="max-h-80" />
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">Verify diff</h2>
              {before != null || after != null ? (
                <DiffView before={before} after={after} />
              ) : (
                <p className="text-sm text-ink-muted">
                  {readPair ? "No pre-write snapshot (read call, or GET pair skipped)." : "No GET pair on this path to verify against."}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
