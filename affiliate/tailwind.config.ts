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
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-dm-sans)", "var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
