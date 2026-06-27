import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#071a3d', royal: '#123c88', sky: '#dcecff', gold: '#eabf55' }, boxShadow: { card: '0 20px 45px rgba(2, 19, 54, .2)' } } }, plugins: [] };
export default config;
