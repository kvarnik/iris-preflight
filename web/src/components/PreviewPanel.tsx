import type { Preview, Risk } from "../lib/types";

const RISK: Record<Risk, string> = {
  read: "badge-read",
  mutating: "badge-mutating",
  destructive: "badge-destructive",
};

type Props = {
  preview: Preview;
  risk: Risk;
  writeEnabled: boolean;
  asyncOp: boolean;
};

export function PreviewPanel({ preview, risk, writeEnabled, asyncOp }: Props) {
  return (
    <section className="rounded-xl border border-line bg-surface-raised p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Preview</h2>
        <span className={`rounded px-2 py-0.5 text-xs ${RISK[risk]}`}>{risk}</span>
        {asyncOp ? <span className="rounded bg-surface-input px-2 py-0.5 text-xs text-ink-muted">async 202</span> : null}
        {preview.simulated ? (
          <span className="rounded bg-iris/20 px-2 py-0.5 text-xs text-iris">role simulation</span>
        ) : null}
      </div>
      <p className={`mt-3 text-lg font-medium ${preview.allowed ? "text-ok" : "text-danger"}`}>
        {preview.allowed ? "Privileges allow this call" : "Privileges would deny this call"}
      </p>
      {preview.mode === "none" ? (
        <p className="mt-1 text-sm text-ink-muted">No %Admin resource is listed for this operation.</p>
      ) : (
        <p className="mt-1 text-sm text-ink-muted">
          Required ({preview.mode === "any" ? "any one" : "all"}): {preview.required.join(" · ") || "—"}
        </p>
      )}
      {preview.missing.length ? (
        <p className="mt-1 font-mono text-sm text-danger">Missing: {preview.missing.join(" · ")}</p>
      ) : null}
      {!writeEnabled && risk !== "read" ? (
        <p className="mt-3 text-sm text-warn">Read-only mode is on. Enable writes in the header to execute.</p>
      ) : null}
    </section>
  );
}
