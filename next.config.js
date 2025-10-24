/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Désactiver ESLint pendant le build de production pour Vercel
    ignoreDuringBuilds: true
  },
  typescript: {
    // Désactiver TypeScript pendant le build de production pour Vercel
    ignoreBuildErrors: true
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      },
      {
        protocol: 'http',
        hostname: '**'
      }
    ]
  }
};

module.exports = nextConfig;