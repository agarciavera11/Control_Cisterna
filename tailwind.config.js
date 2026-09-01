/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14231f',
        muted: '#697873',
        canvas: '#f4f7f5',
        aqua: {
          50: '#effcf9',
          100: '#d7f8f0',
          200: '#b2eee0',
          300: '#7fdcca',
          400: '#47c3ae',
          500: '#29a691',
          600: '#1e8575',
          700: '#1c6b60',
          800: '#1b564e',
          900: '#194841',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 46, 37, .04), 0 12px 32px rgba(18, 46, 37, .06)',
        float: '0 18px 60px rgba(20, 74, 60, .13)',
      },
      animation: {
        'fade-up': 'fadeUp .55s ease-out both',
        'flow': 'flow 1.2s linear infinite',
        'wave': 'wave 7s ease-in-out infinite alternate',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        flow: { from: { transform: 'translateY(-10px)' }, to: { transform: 'translateY(14px)' } },
        wave: { from: { transform: 'translateX(-7%)' }, to: { transform: 'translateX(4%)' } },
        pulseSoft: { '0%, 100%': { opacity: .55 }, '50%': { opacity: 1 } },
      },
    },
  },
  plugins: [],
}
