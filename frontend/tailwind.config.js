/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FCFBF8',
          100: '#FAF8F3',
          200: '#F5F2EB',
          300: '#EBE5D8',
          400: '#DED6C4',
        },
        gold: {
          50: '#FDFCF7',
          100: '#FAF5E3',
          200: '#F4E9C0',
          300: '#EBD691',
          400: '#E2BA56',
          500: '#D49B19',
          600: '#B87E0E',
          700: '#8E5B09',
          800: '#70440C',
        },
        charcoal: {
          50: '#F8F9FA',
          100: '#F1F3F5',
          200: '#E2E5E9',
          300: '#C7CDD4',
          400: '#949FA8',
          500: '#647482',
          600: '#475562',
          700: '#33404D',
          800: '#212A34',
          900: '#141A21',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}
