/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: '#0B0F19',
        card: '#111827',
        primary: '#6366F1',
        'primary-hover': '#818CF8',
        text: '#F8FAFC',
        muted: '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderColor: {
        subtle: 'rgba(255, 255, 255, 0.06)',
      },
      backgroundColor: {
        subtle: 'rgba(255, 255, 255, 0.03)',
      },
    },
  },
  plugins: [],
};
