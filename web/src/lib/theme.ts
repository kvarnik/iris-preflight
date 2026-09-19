export type Theme = "classic" | "dark";

const KEY = "iris-preflight-theme";
const LEGACY_KEY = "iris-guardrail-theme";

export function getTheme(): Theme {
  const stored = window.localStorage.getItem(KEY) || window.localStorage.getItem(LEGACY_KEY);
  return stored === "dark" || stored === "classic" ? stored : "classic";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem(KEY, theme);
}

export const fieldClass =
  "mt-1 w-full rounded-lg border border-line bg-surface-input px-3 py-2 font-mono text-sm text-ink";
export const panelClass = "rounded-xl border border-line bg-surface-raised p-4";
