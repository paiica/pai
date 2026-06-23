import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // One dark family — replaces navy/slate for headings & dark sections
        ink: {
          50:  "#f3f2f7",
          100: "#e5e4ef",
          200: "#c8c6de",
          300: "#a09dbe",
          400: "#787498",
          500: "#55516f",   // body text
          600: "#403d57",
          700: "#2d2b43",
          800: "#1f1d38",
          900: "#171527",   // headings / dark sections
          950: "#0e0c1c",
        },
        // Warm cream — replaces cold slate grays for backgrounds & borders
        sand: {
          50:  "#faf7f4",   // lightest tint
          100: "#f5f0eb",   // page background
          200: "#ece8e2",   // section alt background
          300: "#ddd8d0",   // border
          400: "#bdb7ad",
          500: "#948e84",   // muted text
          600: "#6e6860",
          700: "#504b44",
          800: "#332f2a",
          900: "#1a1714",
        },
        // Single accent — teal
        teal: {
          50:  "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",   // hover state
          500: "#14b8a6",   // primary accent
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
      },
      fontFamily: {
        sans:    ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card:       "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        "card-hover":"0 8px 24px -4px rgb(0 0 0 / 0.10), 0 2px 8px -2px rgb(0 0 0 / 0.06)",
        teal:       "0 4px 20px -4px rgb(20 184 166 / 0.35)",
      },
      backgroundImage: {
        "hero-dark": "linear-gradient(135deg, #171527 0%, #1f1d38 50%, #2d1b69 100%)",
      },
      animation: {
        "fade-in":  "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;
