import { useEffect, useState } from "react";
import { JsonBlock } from "../components/JsonBlock";
import { DiffView } from "../components/DiffView";
import { listEntries } from "../lib/journal";
import type { JournalEntry } from "../lib/types";

type Props = { local: JournalEntry[] };

export function Journal({ local }: Props) {
  const [rows, setRows] = useState<JournalEntry[]>(local);
  const [selected, setSelected] = useState<JournalEntry | null>(local[0] ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEntries()
      .then((items) => {
        setRows(items.length ? items : local);
        setSelected(items[0] ?? local[0] ?? null);
      })
      .catch((err: Error) => {
        setError(err.message);
        setRows(local);
      });
  }, [local]);

  return (
    <div className="grid h-full grid-cols-[360px_1fr] bg-surface">
      <aside className="border-r border-line bg-surface-raised p-3">
        <h1 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Session journal</h1>
        {error ? <p className="mb-2 text-xs text-warn">{error}</p> : null}
        <ul className="h-[calc(100%-2rem)] overflow-auto">
          {rows.map((row, index) => (
            <li key={String(row.id ?? index)}>
              <button
                onClick={() => setSelected(row)}
                className="mb-2 w-full rounded-lg px-2 py-2 text-left hover:bg-surface-input"
              >
                <div className="font-mono text-xs text-iris">{row.operationId}</div>
                <div className="text-xs text-ink-muted">
                  {row.httpStatus ?? "—"} · {row.risk}
                  {row.rolledBack ? " · rolled back" : ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="overflow-auto p-5">
        {selected ? (
          <>
            <h2 className="font-mono text-sm text-iris">{selected.operationId}</h2>
            <p className="text-sm text-ink-muted">
              {selected.url} {selected.rolledBack ? "· rolled back" : ""}
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs uppercase text-ink-muted">Before</h3>
                <JsonBlock value={selected.before} className="max-h-64" />
              </div>
              <div>
                <h3 className="mb-2 text-xs uppercase text-ink-muted">After</h3>
                <JsonBlock value={selected.after} className="max-h-64" />
              </div>
            </div>
            <div className="mt-4">
              <DiffView before={selected.before} after={selected.after} />
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-muted">Execute something in Explorer to fill the journal.</p>
        )}
      </section>
    </div>
  );
}
