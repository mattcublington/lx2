import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Allows importing from monorepo packages without transpilation issues
    serverComponentsExternalPackages: [],
  },
  transpilePackages: ['@lx2/scoring', '@lx2/db', '@lx2/ui', '@lx2/config'],
}

export default nextConfig
