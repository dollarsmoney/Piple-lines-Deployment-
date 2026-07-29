import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle so the Docker image can skip
  // node_modules entirely.
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
  eslint: {
    // Linting is a separate CI job across the whole monorepo; don't run it twice.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
