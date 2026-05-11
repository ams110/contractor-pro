/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:        '#07090D',
        surface:   '#0D1117',
        card:      '#131920',
        primary:   '#00DDB3',
        secondary: '#6366F1',
        success:   '#22C55E',
        warning:   '#EAB308',
        danger:    '#F43F5E',
        brand: {
          DEFAULT: '#00DDB3',
          50:  '#E6FBF7',
          100: '#CCFCF0',
          200: '#99F8E1',
          300: '#66F0D0',
          400: '#33E6BF',
          500: '#00DDB3',
          600: '#00B090',
          700: '#00836C',
          800: '#005748',
          900: '#002B24',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      animation: {
        'fade-in':    'fadeIn 0.28s cubic-bezier(0.22,1,0.36,1) both',
        'fade-up':    'fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'slide-up':   'slideUp 0.38s cubic-bezier(0.32,0.72,0,1) both',
        'shimmer':    'shimmer 2s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'badge-pop':  'badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeUp:    { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideUp:   { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        shimmer:   { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        glowPulse: { '0%,100%': { boxShadow: '0 0 12px #00DDB355' }, '50%': { boxShadow: '0 0 22px #00DDB388' } },
        badgePop:  { '0%': { transform: 'scale(0)' }, '70%': { transform: 'scale(1.2)' }, '100%': { transform: 'scale(1)' } },
      },
      boxShadow: {
        'glow-sm': '0 0 12px #00DDB333',
        'glow':    '0 0 20px #00DDB344',
        'glow-lg': '0 0 32px #00DDB355',
        'card':    '0 4px 24px rgba(0,0,0,0.4)',
        'card-lg': '0 8px 40px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
