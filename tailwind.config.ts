import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#7C3AED',
        surface: '#F8FAFC',
        border: '#E2E8F0',
      },
    },
  },
  plugins: [],
} satisfies Config;
