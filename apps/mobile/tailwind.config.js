// 색상 토큰은 apps/web/src/app/globals.css(@theme, :root --primary)와 같은 이름·값을 쓴다.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#f8faf9',

        primary: '#16a34a',
        'on-primary': '#ffffff',
        'primary-container': '#86efac',
        'on-primary-container': '#052e16',

        org: '#0061a4',
        'secondary-fixed': '#d1e4ff',
        'on-secondary-fixed': '#001d36',

        tertiary: '#b02f00',
        'tertiary-container': '#ff6e43',
        'on-tertiary': '#ffffff',

        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#410002',

        surface: '#f8faf9',
        'surface-container-low': '#f2f4f3',
        'surface-container': '#eceeee',
        'surface-container-lowest': '#ffffff',

        'on-surface': '#191c1c',
        'on-surface-variant': '#3f4948',
        outline: '#6f7978',
        'outline-variant': '#bec9c8',
      },
    },
  },
  plugins: [],
};
