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
        background: '#f6f5f4',
        foreground: '#191919',
        card: '#ffffff',
        border: '#e0dedb',
        primary: {
          DEFAULT: '#0f172a',
          foreground: '#f8fafc',
        },
        highway: {
          sos: '#dc2626',
          active: '#16a34a',
          warning: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};

export default config;
