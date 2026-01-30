import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#895af6',
          dark: '#7c4ef0',
          light: '#a580f8',
        },
        secondary: {
          DEFAULT: '#090653',
          light: '#1a1466',
        },
        background: {
          light: '#f6f5f8',
          dark: '#151022',
        },
        surface: {
          light: '#ffffff',
          dark: '#1e1a2e',
        },
        lavender: {
          soft: '#F8F7FC',
        },
        accent: {
          pink: '#dc7aa4',
          cyan: '#00d4ff',
          yellow: '#f6e05e',
          orange: '#f6ad55',
        },
      },
      fontFamily: {
        quicksand: ['var(--font-quicksand)', 'Quicksand', 'sans-serif'],
        display: ['var(--font-quicksand)', 'Quicksand', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '1.75rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.08)',
        glow: '0 0 15px rgba(137, 90, 246, 0.4)',
        'glow-sm': '0 0 8px rgba(137, 90, 246, 0.4)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
        'bounce-soft': 'bounceSoft 1s infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(137, 90, 246, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(137, 90, 246, 0)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
