import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  "#f0f4fa",
          100: "#dde5f3",
          200: "#c3cfe8",
          300: "#9bafd6",
          400: "#7089bf",
          500: "#5069ab",
          600: "#3d5291",
          700: "#334375",
          800: "#2d3a61",
          900: "#1a2340",
        },
        gold: {
          50:  "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          400: "#facc15",
          600: "#ca8a04",
          700: "#a16207",
          800: "#854d0e",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
