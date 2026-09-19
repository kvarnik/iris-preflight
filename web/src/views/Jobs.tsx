import { useEffect, useState } from "react";
import { adminCall } from "../lib/api";
import { JsonBlock } from "../components/JsonBlock";
import type { Job } from "../lib/types";

type Props = {
  jobs: Job[];
  onJobs: (jobs: Job[]) => void;
};

export function Jobs({ jobs, onJobs }: Props) {
  const [selected, setSelected] = useState<string | null>(jobs[0]?.guid ?? null);

  useEffect(() => {
    if (!jobs.length) return;
    const timer = window.setInterval(async () => {
      const next = await Promise.all(
        jobs.map(async (job) => {
          if (job.status === "done" || job.status === "error" || job.status === "cancelled") return job;
          const res = await adminCall("GET", `/v2/async-result?id=${encodeURIComponent(job.guid)}`);
          const result = res.envelope?.result as { RunningState?: string; HasEnded?: boolean } | undefined;
          let status = job.status;
          if (!res.ok) status = "error";
          else if (result?.HasEnded) status = "done";
          else if (result?.RunningState) status = String(result.RunningState).toLowerCase();
          else status = "running";
          return { ...job, status, result: res.raw };
        }),
      );
      onJobs(next);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [jobs, onJobs]);

  async function control(action: "cancel" | "pause" | "resume", guid: string) {
    const res = await adminCall("POST", `/v2/async-result/${action}?id=${encodeURIComponent(guid)}`);
    onJobs(
      jobs.map((job) =>
        job.guid === guid
          ? { ...job, status: action === "cancel" ? "cancelled" : action, result: res.raw }
          : job,
      ),
    );
  }

  const current = jobs.find((job) => job.guid === selected) || jobs[0];

  return (
    <div className="grid h-full grid-cols-[320px_1fr] bg-surface">
      <aside className="border-r border-line bg-surface-raised p-3">
        <h1 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Async jobs</h1>
        {jobs.length === 0 ? <p className="text-sm text-ink-muted">No tracked tasks yet. Execute an async operation from Explorer.</p> : null}
        <ul>
          {jobs.map((job) => (
            <li key={job.guid}>
              <button
                onClick={() => setSelected(job.guid)}
                className={`mb-2 w-full rounded-lg px-2 py-2 text-left ${
                  current?.guid === job.guid ? "bg-iris/15" : "hover:bg-surface-input"
                }`}
              >
                <div className="font-mono text-xs text-iris">{job.guid}</div>
                <div className="text-xs text-ink-muted">
                  {job.operationId} · {job.status}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="overflow-auto p-5">
        {current ? (
          <>
            <h2 className="font-mono text-sm text-iris">{current.guid}</h2>
            <p className="text-ink-muted">{current.operationId}</p>
            <div className="mt-4 flex gap-2">
              <button className="rounded-lg bg-danger px-3 py-1.5 text-sm text-white" onClick={() => control("cancel", current.guid)}>
                Cancel
              </button>
              <button className="rounded-lg bg-warn px-3 py-1.5 text-sm text-white" onClick={() => control("pause", current.guid)}>
                Pause
              </button>
              <button className="rounded-lg bg-ok px-3 py-1.5 text-sm text-white" onClick={() => control("resume", current.guid)}>
                Resume
              </button>
            </div>
            <div className="mt-4">
              <JsonBlock value={current.result ?? { status: current.status }} className="max-h-[70vh]" />
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
