import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  transpilePackages: ['@lx2/scoring', '@lx2/db', '@lx2/ui', '@lx2/config'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig