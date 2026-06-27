/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2c1a0e',
          dark: '#1a0f07',
          light: '#4a2e1a',
          50: '#faf5f0',
          100: '#f0e6d9',
        },
        accent: {
          DEFAULT: '#c45c2a',
          dark: '#9e4420',
          light: '#e07844',
          50: '#fdf2ec',
        },
        ink: {
          DEFAULT: '#1c1714',
          muted: '#6b5548',
        },
        surface: '#faf8f5',
        muted: '#f2ede8',
        line: '#e5ddd6',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
