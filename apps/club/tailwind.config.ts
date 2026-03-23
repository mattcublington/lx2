import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E8EDF5',
          100: '#B8C8E0',
          500: '#2563EB',
          600: '#1D4ED8',
          900: '#1E3A5F',
        },
      },
    },
  },
  plugins: [],
}

export default config
