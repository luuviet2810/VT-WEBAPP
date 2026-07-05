/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff8ff',
          100: '#dbeffe',
          200: '#bfe4fe',
          300: '#93d4fd',
          400: '#5fbdfa',
          500: '#3aa2f2',
          600: '#2584e6',
          700: '#1d6cd0',
          800: '#1f59a8',
          900: '#1f4b85',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(16, 24, 40, 0.05), 0 1px 3px 0 rgba(16, 24, 40, 0.04)',
      },
    },
  },
  plugins: [],
}
