import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          light: "#faf8f3",
          dark: "#121614",
          card: "#ffffff",
          cardDark: "#1a211e",
          border: "#e5e0d4",
          borderDark: "#2d3833",
        },
        ksrtc: {
          green: {
            DEFAULT: "#1b5e20",
            light: "#2e7d32",
            bright: "#22c55e",
            bg: "#e8f5e9",
            bgDark: "#0d2814",
          },
          amber: {
            DEFAULT: "#d97706",
            dark: "#b45309",
            light: "#f59e0b",
            bg: "#fef3c7",
            bgDark: "#312006",
          },
          rust: {
            DEFAULT: "#b91c1c",
            dark: "#991b1b",
            bg: "#fee2e2",
            bgDark: "#321111",
          },
          navy: "#1e293b",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        ticket: "0 2px 8px -2px rgba(0,0,0,0.06), 0 4px 12px 0 rgba(0,0,0,0.04)",
        stamp: "0 0 0 2px currentColor",
      },
    },
  },
  plugins: [],
};

export default config;
