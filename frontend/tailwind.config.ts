import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kaisenflow: {
          'bg-primary': '#0A0A0F',
          'bg-secondary': '#111118',
          'bg-card': '#16161F',
          'bg-elevated': '#1C1C28',
          border: '#2A2A3A',
          'text-primary': '#F8F8FF',
          'text-secondary': '#9898B0',
          'text-tertiary': '#5A5A72',
          'accent-blue': '#4F6EF7',
          'accent-green': '#22C55E',
          'accent-amber': '#F59E0B',
          'accent-red': '#EF4444',
          'accent-purple': '#A855F7',
          'accent-cyan': '#06B6D4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'bounce-delay-150': 'bounce 1s infinite 150ms',
        'bounce-delay-300': 'bounce 1s infinite 300ms',
      },
    },
  },
  plugins: [],
};

export default config;
