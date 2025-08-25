/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0f17",
        card: "#121826",
        accent: "#2dd4bf",
        accent2: "#22d3ee",
        text: "#e5e7eb",
        subtle: "#9ca3af"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.35)",
        glow: "0 0 20px rgba(45,212,191,0.45)"
      },
      borderRadius: {
        xl2: "1rem",
      }
    },
  },
  plugins: [],
}
