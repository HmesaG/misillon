/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a3a2e',
          dark: '#0f2318',
          light: '#2d5c47',
          50: '#f0f7f4',
          100: '#d9ece5',
        },
        accent: {
          DEFAULT: '#c9943a',
          dark: '#a67828',
          light: '#e4b862',
          50: '#fdf6e8',
        },
        ink: {
          DEFAULT: '#1a1f1e',
          muted: '#526860',
        },
        surface: '#fafaf8',
        muted: '#f0efed',
        line: '#e0dfdc',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
