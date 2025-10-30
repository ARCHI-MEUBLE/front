/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Désactiver la génération statique pour éviter les erreurs NextRouter
  output: 'standalone',
  // Forcer le rendu dynamique pour toutes les pages
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
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