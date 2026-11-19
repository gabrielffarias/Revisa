import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  experimental: { staleTimes: { dynamic: 30, static: 300 }, serverActions: { bodySizeLimit: '2mb' } },
}
export default nextConfig
