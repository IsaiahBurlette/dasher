import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff2eb",
          100: "#ffe0cc",
          200: "#ffc199",
          300: "#ff9d5c",
          400: "#ff7a2e",
          500: "#eb1700",
          600: "#c81300",
          700: "#a10f00",
          800: "#7a0b00",
          900: "#520800"
        }
      }
    }
  },
  darkMode: "media",
  plugins: []
};

export default config;
