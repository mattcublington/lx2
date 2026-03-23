import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@lx2/db', '@lx2/ui', '@lx2/brand', '@lx2/scoring'],
}

export default nextConfig
