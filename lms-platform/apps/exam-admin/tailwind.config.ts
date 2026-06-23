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
          950: "#0f1528",
        },
        brand: {
          50:  "#eff1fe",
          100: "#e1e5fd",
          200: "#c9cffa",
          300: "#a6b0f6",
          400: "#818def",
          500: "#6366e8",   // vivid indigo-ish
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b5e",
        },
      },
      boxShadow: {
        "glow-brand": "0 0 20px 0 rgba(99,102,232,0.20)",
        "glow-navy":  "0 0 20px 0 rgba(61,82,145,0.25)",
        "inner-top":  "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #4f46e5 0%, #3d5291 100%)",
        "gradient-card":  "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, transparent 100%)",
      },
    },
  },
  safelist: [
    { pattern: /^(bg|text|border|ring|shadow)-brand-(50|100|200|300|400|500|600|700|800|900|950)/ },
    "shadow-glow-brand",
    "shadow-glow-navy",
    "shadow-inner-top",
  ],
  plugins: [],
};

export default config;
