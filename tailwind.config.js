/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./job/**/*.html",
    "./jobs/**/*.html",
    "./admin/**/*.html",
    "./resources/**/*.html",
    "./scripts/**/*.js",
    "./lib/**/*.js",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        display: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
        outfit: ['system-ui', 'sans-serif'],
      },
      colors: {
        // Deep Midnight Navy - Primary Brand
        navy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          300: '#9FB3C8',
          400: '#829AB1',
          500: '#627D98',
          600: '#486581',
          700: '#334E68',
          800: '#1B3A7D',
          900: '#061D45', // Primary
          950: '#090F1B',
        },
        // Rich Teal - Secondary Brand
        teal: {
          50: '#EFF4FC',
          100: '#DBE6F8',
          200: '#BDD0EF',
          300: '#95B3E1',
          400: '#678CC6',
          500: '#345D9A',
          600: '#1B3A7D', // Secondary
          700: '#153168',
          800: '#102654',
          900: '#061D45',
        },
        // Electric Lime - Accent Brand
        lime: {
          50: '#FFFBEF',
          100: '#FFF4CC',
          200: '#FFE39A',
          300: '#F6C964',
          400: '#E8A317', // Accent
          500: '#D4920A',
          600: '#A96C00',
          700: '#805100',
          800: '#653F00',
          900: '#4A2D00',
        },
        // Surface & Neutrals
        ivory: '#FFFFFF',
        charcoal: '#202A36',
        slate: '#526174',
        surface: '#FFFFFF',
        border: '#E5E7EB',
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(16, 26, 44, 0.05), 0 1px 4px -1px rgba(16, 26, 44, 0.03)',
        'card-hover': '0 16px 32px -8px rgba(16, 26, 44, 0.09), 0 4px 12px -2px rgba(16, 26, 44, 0.04)',
        'glow-teal': '0 0 24px -4px rgba(8, 127, 140, 0.35)',
        'glow-lime': '0 0 24px -4px rgba(199, 243, 107, 0.45)',
      },
    },
  },
  plugins: [],
}
