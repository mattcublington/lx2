import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 500: '#1D9E75' },
      },
    },
  },
  plugins: [],
}

export default config
