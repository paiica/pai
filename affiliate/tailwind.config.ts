import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Marketing-site palette
        ink: {
          50: "#f3f2f7", 100: "#e5e4ef", 200: "#c8c6de", 300: "#a09dbe",
          400: "#787498", 500: "#55516f", 600: "#403d57", 700: "#2d2b43",
          800: "#1f1d38", 900: "#171527", 950: "#0e0c1c",
        },
        sand: {
          50: "#faf7f4", 100: "#f5f0eb", 200: "#ece8e2", 300: "#ddd8d0",
          400: "#bdb7ad", 500: "#948e84", 600: "#6e6860", 700: "#504b44",
        },
        teal: {
          50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4", 300: "#5eead4",
          400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e",
          800: "#115e59", 900: "#134e4a",
        },
        // Dashboard palette (kept for sidebar/nav) — remapped to the ink/seal scale
        navy: {
          50: "#f3f2f7", 100: "#e5e4ef", 200: "#c8c6de", 300: "#a09dbe",
          400: "#787498", 500: "#55516f", 600: "#403d57", 700: "#2d2b43",
          800: "#1f1d38", 900: "#171527",
        },
        gold: {
          50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4", 300: "#5eead4",
          400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "var(--font-jakarta)", "serif"],
      },
      backgroundImage: {
        "hero-dark": "linear-gradient(135deg, #171527 0%, #1f1d38 50%, #2d1b69 100%)",
      },
      boxShadow: {
        teal: "0 4px 20px -4px rgb(20 184 166 / 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
