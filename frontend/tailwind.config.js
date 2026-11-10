/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },
      colors: {
        faith: {
          900: "#1e1b4b",
          800: "#312e81",
          700: "#4338ca",
          600: "#4f46e5",
          500: "#6366f1",
          400: "#818cf8",
        },
        gold: {
          600: "#b8860b",
          500: "#d4a017",
        },
      },
    },
  },
  plugins: [],
}
