import { useState } from "react";
import { applyTheme, getTheme, type Theme } from "../lib/theme";

type Props = { variant?: "page" | "header" };

export function ThemeToggle({ variant = "page" }: Props) {
  const [theme, setTheme] = useState<Theme>(() => getTheme());

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  const onHeader = variant === "header";

  return (
    <div
      className={`inline-flex rounded-full p-0.5 text-xs font-semibold ${
        onHeader ? "border border-white/25 bg-black/20" : "border border-line bg-surface-input"
      }`}
    >
      <button
        type="button"
        onClick={() => choose("classic")}
        className={`rounded-full px-2.5 py-1 ${
          theme === "classic"
            ? "bg-iris text-white"
            : onHeader
              ? "text-white/70 hover:text-white"
              : "text-ink-muted hover:text-ink"
        }`}
      >
        Classic
      </button>
      <button
        type="button"
        onClick={() => choose("dark")}
        className={`rounded-full px-2.5 py-1 ${
          theme === "dark"
            ? "bg-iris text-white"
            : onHeader
              ? "text-white/70 hover:text-white"
              : "text-ink-muted hover:text-ink"
        }`}
      >
        Dark
      </button>
    </div>
  );
}
