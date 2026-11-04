/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./job/**/*.html",
    "./jobs/**/*.html",
    "./admin/**/*.html",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        outfit: ['"Outfit"', 'sans-serif'],
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
          800: '#1A2942',
          900: '#101A2C', // Primary
          950: '#090F1B',
        },
        // Rich Teal - Secondary Brand
        teal: {
          50: '#EBF9FA',
          100: '#D2F4F7',
          200: '#A6E9EE',
          300: '#72D9E2',
          400: '#3BC3D1',
          500: '#15AAB9',
          600: '#087F8C', // Secondary
          700: '#066570',
          800: '#054E57',
          900: '#043A40',
        },
        // Electric Lime - Accent Brand
        lime: {
          50: '#F8FEE9',
          100: '#EFFCD2',
          200: '#E1FAA7',
          300: '#D6F887',
          400: '#C7F36B', // Accent
          500: '#A6DC39',
          600: '#83B621',
          700: '#648E19',
          800: '#4A6915',
          900: '#324810',
        },
        // Surface & Neutrals
        ivory: '#F7F6F0',
        charcoal: '#202A36',
        slate: '#8993A2',
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
