import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0D0D0D",
        "bg-card": "#161616",
        "bg-elevated": "#1C1C1C",
        fg: "#F5F0E8",
        "fg-muted": "#9D9690",
        amber: {
          DEFAULT: "#F59E0B",
          dim: "#92600A",
        },
        indigo: {
          DEFAULT: "#6366F1",
          dim: "#3730A3",
        },
        green: {
          DEFAULT: "#10B981",
          dim: "#065F46",
        },
        rose: {
          DEFAULT: "#F43F5E",
          dim: "#9F1239",
        },
        teal: {
          DEFAULT: "#14B8A6",
          dim: "#0F5A52",
        },
        border: "#2A2A2A",
      },
      fontFamily: {
        serif: ["var(--font-dm-serif)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "Consolas", "monospace"],
        sans: ["var(--font-dm-serif)", "Georgia", "serif"],
      },
      animation: {
        "count-up": "count-up 1.2s ease-out forwards",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "slide-up": "slide-up 0.5s ease-out forwards",
        "draw-in": "draw-in 1.5s ease-out forwards",
      },
      keyframes: {
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "draw-in": {
          "0%": { opacity: "0", strokeDashoffset: "1000" },
          "100%": { opacity: "1", strokeDashoffset: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
