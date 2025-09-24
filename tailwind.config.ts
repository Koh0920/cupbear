import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#0B1F3B",
        accent: "#1DB954",
        ink: "#0F172A",
        canvas: "#F7FAFC",
      },
    },
  },
  plugins: [],
};

export default config;
