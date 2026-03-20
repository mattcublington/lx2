import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: [],
  transpilePackages: ['@lx2/scoring', '@lx2/db', '@lx2/ui', '@lx2/config'],
}

export default nextConfig