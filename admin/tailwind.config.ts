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
    },
  },
  plugins: [],
};

export default config;
