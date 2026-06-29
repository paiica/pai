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
        // Dashboard palette (kept for sidebar/nav)
        navy: {
          50: "#eef1f8", 100: "#d5ddef", 200: "#abbcdf", 300: "#7e97cb",
          400: "#5476b8", 500: "#2f5aa5", 600: "#1e4080", 700: "#152e5e",
          800: "#0e1e3d", 900: "#080f1f",
        },
        gold: {
          50: "#fdf9ed", 100: "#faf0d0", 200: "#f4dea0", 300: "#ecc96a",
          400: "#e4b340", 500: "#c9913a", 600: "#a56e28", 700: "#7d5020",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-jakarta)", "var(--font-dm-sans)", "sans-serif"],
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
