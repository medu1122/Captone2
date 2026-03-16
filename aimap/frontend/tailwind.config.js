/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#256af4',
        'background-light': '#ffffff',
        'background-dark': '#0a0a0a',
        'surface-dark': '#1e293b',
        'border-dark': '#334155',
      },
      fontFamily: {
        sans: ['\"Source Sans 3\"', 'system-ui', 'sans-serif'],
        display: ['\"Source Sans 3\"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
