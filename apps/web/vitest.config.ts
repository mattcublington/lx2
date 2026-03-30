import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // jsdom provides window, localStorage, navigator.onLine and other browser globals
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Resolve workspace packages from TypeScript source so vitest doesn't need compiled dist/
      '@lx2/leaderboard': path.resolve(__dirname, '../../packages/leaderboard/src/index.ts'),
      '@lx2/scoring': path.resolve(__dirname, '../../packages/scoring/src/index.ts'),
    },
  },
})
