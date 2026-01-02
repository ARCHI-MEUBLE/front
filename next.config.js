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
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/backend/api/:path*',
        destination: '/api/proxy/backend/api/:path*'
      },
      // Proxy pour les uploads (images) du backend
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`
      }
    ];
  }
};

module.exports = nextConfig;