/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#102a43',
        mist: '#f4f7f9',
        coral: '#e76f51',
        mint: '#2a9d8f',
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'sans-serif'],
        display: ['DM Sans', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 45px rgba(16, 42, 67, 0.08)',
      },
    },
  },
  plugins: [],
}
