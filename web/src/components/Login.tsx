import { FormEvent, useState } from "react";
import { encodeBasic, setSession } from "../lib/auth";
import { getInfo } from "../lib/api";
import { fieldClass } from "../lib/theme";
import { ThemeToggle } from "./ThemeToggle";

type Props = { onReady: () => void };

export function Login({ onReady }: Props) {
  const [username, setUsername] = useState("SuperUser");
  const [password, setPassword] = useState("SYS");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const basic = encodeBasic(username, password);
      const info = await getInfo(basic);
      setSession({ username: info.username || username, basic, info });
      onReady();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-surface p-6">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-line bg-surface-raised p-8 shadow-xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-iris">IRIS Preflight</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Connect to SysAdmin API</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Credentials stay in a JS closure for this tab. They are sent only as an Authorization header.
        </p>
        <label className="mt-6 block text-sm text-ink">
          Username
          <input
            className={fieldClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="mt-4 block text-sm text-ink">
          Password
          <input
            type="password"
            className={fieldClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-iris px-4 py-2 font-medium text-white hover:bg-iris-hover disabled:opacity-50"
        >
          {busy ? "Checking /info…" : "Connect"}
        </button>
      </form>
    </div>
  );
}
