import type { Config } from 'tailwindcss';

// Paleta de marca KinePro - paleta-colores-kinepro.jpeg
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        kineblue: {
          DEFAULT: '#005C9C',
          light: '#99D5F2',
          deep: '#002D4C',
        },
        progreen: {
          DEFAULT: '#4AA54D',
          light: '#A1DFA0',
          deep: '#1B7C1E',
        },
        teal: {
          accent: '#29B6B6',
        },
        neutral: {
          gray: '#757575',
          bg: '#F1F1F1',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
