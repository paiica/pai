import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  "#f3f2f7",
          100: "#e5e4ef",
          200: "#c8c6de",
          300: "#a09dbe",
          400: "#787498",
          500: "#55516f",
          600: "#403d57",
          700: "#2d2b43",
          800: "#1f1d38",
          900: "#171527",
          950: "#0e0c1c",
        },
        // Primary interactive accent — remapped from indigo to the site-wide teal scale
        brand: {
          50:  "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#0a2e2b",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "var(--font-jakarta)", "system-ui", "sans-serif"],
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "glow-brand": "0 0 20px 0 rgba(20,184,166,0.20)",
        "glow-navy":  "0 0 20px 0 rgba(61,82,145,0.25)",
        "inner-top":  "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #14b8a6 0%, #403d57 100%)",
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
