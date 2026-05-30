/** @type {import('tailwindcss').Config} */
// Barcha ranglar CSS o'zgaruvchilariga (tokens.css) ishora qiladi.
// Hardcode rang ishlatilmaydi -> light/dark .dark klassi orqali avtomatik.
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        white: 'var(--white)',
        black: 'var(--black)',
        bg: {
          base: 'var(--bg-base)',
          1: 'var(--bg-elevation-1)',
          '1-alt': 'var(--bg-elevation-1-alt)',
          2: 'var(--bg-elevation-2)',
          '2-alt': 'var(--bg-elevation-2-alt)',
          3: 'var(--bg-elevation-3)',
          '3-alt': 'var(--bg-elevation-3-alt)',
        },
        accent: {
          strong: 'var(--accent-strong)',
          sub: 'var(--accent-sub)',
          soft: 'var(--accent-soft)',
          disabled: 'var(--accent-disabled)',
          white: 'var(--accent-white)',
        },
        text: {
          strong: 'var(--text-strong)',
          sub: 'var(--text-sub)',
          soft: 'var(--text-soft)',
          disabled: 'var(--text-disabled)',
          white: 'var(--text-white)',
          accent: 'var(--text-accent)',
          'in-dark': 'var(--text-in-dark)',
        },
        stroke: {
          strong: 'var(--stroke-strong)',
          sub: 'var(--stroke-sub)',
          soft: 'var(--stroke-soft)',
          accent: 'var(--stroke-accent)',
          white: 'var(--stroke-white)',
        },
        icon: {
          strong: 'var(--icon-strong)',
          sub: 'var(--icon-sub)',
          soft: 'var(--icon-soft)',
          disable: 'var(--icon-disable)',
          white: 'var(--icon-white)',
          accent: 'var(--icon-accent)',
        },
        error: {
          strong: 'var(--error-strong)',
          sub: 'var(--error-sub)',
          soft: 'var(--error-soft)',
          disabled: 'var(--error-disabled)',
        },
      },
      borderColor: {
        DEFAULT: 'var(--stroke-sub)',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)',
        elevated: '0 4px 16px rgba(16, 24, 40, 0.08)',
      },
      keyframes: {
        'pulse-error': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(224, 45, 45, 0.4)' },
          '50%': { boxShadow: '0 0 0 4px rgba(224, 45, 45, 0)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-error': 'pulse-error 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
