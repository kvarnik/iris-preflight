export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        surface: {
          DEFAULT: "var(--bg)",
          raised: "var(--bg-raised)",
          input: "var(--bg-input)",
          header: "var(--header)",
        },
        ink: {
          DEFAULT: "var(--text)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        line: "var(--line)",
        iris: {
          DEFAULT: "var(--iris)",
          navy: "var(--iris-navy)",
          hover: "var(--iris-hover)",
        },
        ok: "var(--ok)",
        warn: "var(--warn)",
        danger: "var(--danger)",
      },
    },
  },
  plugins: [],
};
