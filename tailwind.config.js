/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dental: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        clinic: {
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          accent: '#0ea5e9',
        }
      },
      boxShadow: {
        'dental': '0 4px 20px -2px rgba(14, 165, 233, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'dental-lg': '0 10px 30px -4px rgba(14, 165, 233, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
        'dental-hover': '0 16px 36px -6px rgba(14, 165, 233, 0.18), 0 6px 16px -3px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      }
    },
  },
  plugins: [],
}
