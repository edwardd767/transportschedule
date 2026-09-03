import type { NextConfig } from 'next';

const nextConfig: NextConfig = process.env.HOTELX_GITHUB_PAGES === 'true'
  ? { output: 'export', assetPrefix: '/transportschedule', trailingSlash: true }
  : {};

export default nextConfig;
