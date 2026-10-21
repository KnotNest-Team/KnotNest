/** KnotNest design tokens (shared with src/styles/landing.css CSS variables) */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ivory: { DEFAULT: '#F7F1E8', 2: '#EFE6D6' },
        cream: '#FBF7EF',
        maroon: { DEFAULT: '#6E1E2A', dk: '#4A121B', 50: '#F8ECEE' },
        gold: { DEFAULT: '#B8894A', lt: '#D9B57A' },
        rose: '#D9AFA0',
        ink: { DEFAULT: '#1A1414', 2: '#3A2E2A', bg: '#14100F' },
        muted: '#7A6A62',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['Jost', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,20,20,.04), 0 12px 32px -18px rgba(26,20,20,.25)',
        cta: '0 20px 40px -20px rgba(110,30,42,.6)',
      },
    },
  },
  plugins: [],
};
