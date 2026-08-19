/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        asi: {
          navy: '#0b0f19',
          card: '#151c2e',
          cardLight: '#1e293b',
          red: '#e11d48',
          redHover: '#be123c',
          gold: '#f59e0b',
          goldHover: '#d97706',
          cyan: '#06b6d4',
          emerald: '#10b981',
          purple: '#8b5cf6',
          amber: '#f59e0b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-short': 'bounce 0.5s ease-in-out 2',
      }
    },
  },
  plugins: [],
}
