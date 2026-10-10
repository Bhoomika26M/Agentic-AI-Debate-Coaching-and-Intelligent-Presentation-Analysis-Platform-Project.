/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // "The Arena" signature palette
        arena: {
          bg: {
            dark: '#080B10',       // Deep ink-navy
            card: '#0F141E',      // Chamber slate
            elevated: '#171F2D',  // Elevated podium slate
            light: '#F8F9FA',     // Crisp parchment-light
            cardLight: '#FFFFFF',
          },
          parchment: '#F3EFE6',   // Warm parchment white
          muted: '#8E9AA8',       // Muted slate gray
          amber: {
            DEFAULT: '#F59E0B',   // Electric spotlight amber
            glow: '#FBBF24',
            deep: '#B45309',
          },
          // Proposition (Teal) vs Opposition (Crimson)
          prop: {
            DEFAULT: '#0D9488',   // Proposition Teal
            glow: '#14B8A6',
            light: '#CCFBF1',
            dark: '#115E59',
          },
          opp: {
            DEFAULT: '#E11D48',    // Opposition Crimson
            glow: '#F43F5E',
            light: '#FFE4E6',
            dark: '#9F1239',
          }
        }
      },
      fontFamily: {
        serif: ['Fraunces', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'spotlight': '0 0 50px -10px rgba(245, 158, 11, 0.25)',
        'prop-glow': '0 0 30px -5px rgba(13, 148, 136, 0.3)',
        'opp-glow': '0 0 30px -5px rgba(225, 29, 72, 0.3)',
      }
    },
  },
  plugins: [],
}
