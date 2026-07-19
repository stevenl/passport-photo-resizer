/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F3F1EA",
        ink: {
          DEFAULT: "#1C2230",
          soft: "#5B6472",
          faint: "#8A8F99",
        },
        line: "#C9C2B2",
        measure: "#B8472F",
        ok: "#3C6E52",
        warn: "#C08A1E",
        panel: "#FFFFFF",
      },
      fontFamily: {
        display: ["Archivo", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        widest2: "0.18em",
      },
    },
  },
  plugins: [],
};
