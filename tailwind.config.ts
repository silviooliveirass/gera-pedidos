import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e9f7ef",
          100: "#c8ead8",
          500: "#2f9e68",
          600: "#248454",
          700: "#1c6541"
        }
      }
    }
  },
  plugins: []
};

export default config;
