import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#071a3d',
        royal: '#123c88',
        sky: '#dcecff',
        gold: '#eabf55',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        extrabold: '750',
        black: '800',
      },
      boxShadow: {
        card: '0 20px 45px rgba(2, 19, 54, .2)',
      },
    },
  },
  plugins: [],
};
export default config;
