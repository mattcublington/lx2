import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const config = compat.extends('next/core-web-vitals', 'next/typescript')

export default [
  { ignores: ['.next/**', 'node_modules/**', 'postcss.config.js', 'scripts/**', 'next-env.d.ts', 'eslint.config.mjs'] },
  ...config,
  {
    rules: {
      '@next/next/no-page-custom-font': 'off',
    },
  },
]
