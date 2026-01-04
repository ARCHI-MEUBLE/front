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
  webpack: (config, { isServer }) => {
    // Éviter les instances multiples de Three.js
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'three': require.resolve('three')
      };
    }
    return config;
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
      },
      // Proxy pour les modèles 3D générés du backend
      {
        source: '/models/:path*',
        destination: `${backendUrl}/models/:path*`
      }
    ];
  }
};

module.exports = nextConfig;