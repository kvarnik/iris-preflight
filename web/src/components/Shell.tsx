import type { ReactNode } from "react";
import { clearSession, getSession } from "../lib/auth";
import { disableDemoMode, isDemoMode } from "../lib/demo";
import type { Job } from "../lib/types";
import { ThemeToggle } from "./ThemeToggle";

export type View = "explorer" | "matrix" | "jobs" | "journal";

type Props = {
  view: View;
  onView: (view: View) => void;
  writeEnabled: boolean;
  onToggleWrite: () => void;
  jobs: Job[];
  children: ReactNode;
};

const VIEWS: { id: View; label: string }[] = [
  { id: "explorer", label: "Explorer" },
  { id: "matrix", label: "Matrix" },
  { id: "jobs", label: "Jobs" },
  { id: "journal", label: "Journal" },
];

export function Shell({ view, onView, writeEnabled, onToggleWrite, jobs, children }: Props) {
  const session = getSession();
  const running = jobs.filter((job) => job.status === "running" || job.status === "queued").length;

  return (
    <div className="flex min-h-full flex-col bg-surface text-ink">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-surface-header px-4 py-2.5 text-white">
        <div className="min-w-0">
          <div className="whitespace-nowrap font-mono text-xs uppercase tracking-[0.2em] text-iris">IRIS Preflight</div>
          <div className="truncate text-sm text-white/70">
            {session?.info.username} · {session?.info.product} · api v{session?.info.apiVersion}
            {isDemoMode() ? " · demo" : ""}
          </div>
        </div>
        <nav className="flex flex-wrap gap-1">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              onClick={() => onView(item.id)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                view === item.id ? "bg-iris text-white" : "text-white/80 hover:bg-white/10"
              }`}
            >
              {item.label}
              {item.id === "jobs" && running ? (
                <span className="ml-2 rounded-full bg-white px-1.5 text-xs text-iris-navy">{running}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle variant="header" />
          <button
            onClick={onToggleWrite}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              writeEnabled ? "bg-danger text-white" : "border border-white/30 bg-white/10 text-white"
            }`}
          >
            {writeEnabled ? "Writes enabled" : "Read-only"}
          </button>
          <button
            onClick={() => {
              disableDemoMode();
              clearSession();
              window.location.reload();
            }}
            className="text-sm text-white/70 hover:text-white"
          >
            Disconnect
          </button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
