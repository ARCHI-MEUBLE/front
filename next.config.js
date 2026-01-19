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
      // Désactiver les avertissements de chunk size
      config.performance = {
        ...config.performance,
        hints: false,
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
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
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
      // Proxy pour les uploads locaux (via /backend/uploads)
      {
        source: '/backend/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`
      },
      // Proxy pour les modèles 3D générés du backend
      {
        source: '/models/:path*',
        destination: `${backendUrl}/models/:path*`
      },
      // Proxy pour les textures uploadées côté backend
      {
        source: '/back/textures/:path*',
        destination: `${backendUrl}/back/textures/:path*`
      }
    ];
  }
};

module.exports = nextConfig;