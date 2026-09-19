import { useCallback, useState } from "react";
import { Login } from "./components/Login";
import { Shell, type View } from "./components/Shell";
import { Explorer } from "./views/Explorer";
import { Matrix } from "./views/Matrix";
import { Jobs } from "./views/Jobs";
import { Journal } from "./views/Journal";
import { getSession } from "./lib/auth";
import { assertInventory } from "./lib/inventory";
import type { Job, JournalEntry } from "./lib/types";

assertInventory();

export function App() {
  const [, setTick] = useState(0);
  const [view, setView] = useState<View>("explorer");
  const [writeEnabled, setWriteEnabled] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const session = getSession();

  const onJob = useCallback((job: Job) => {
    setJobs((current) => [job, ...current.filter((row) => row.guid !== job.guid)]);
    setView("jobs");
  }, []);

  const onJournal = useCallback((entry: JournalEntry) => {
    setJournal((current) => [entry, ...current]);
  }, []);

  if (!session) {
    return <Login onReady={() => setTick((n) => n + 1)} />;
  }

  return (
    <Shell
      view={view}
      onView={setView}
      writeEnabled={writeEnabled}
      onToggleWrite={() => {
        if (writeEnabled) {
          setWriteEnabled(false);
          return;
        }
        const ok = window.confirm("Enable writes? Destructive SysAdmin calls will be allowed after confirmation.");
        if (ok) setWriteEnabled(true);
      }}
      jobs={jobs}
    >
      {view === "explorer" ? (
        <Explorer writeEnabled={writeEnabled} onJob={onJob} onJournal={onJournal} />
      ) : null}
      {view === "matrix" ? <Matrix /> : null}
      {view === "jobs" ? <Jobs jobs={jobs} onJobs={setJobs} /> : null}
      {view === "journal" ? <Journal local={journal} /> : null}
    </Shell>
  );
}
