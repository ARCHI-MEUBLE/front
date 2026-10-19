const backendImagePattern = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_API_URL || '');
    return { protocol: url.protocol.replace(':', ''), hostname: url.hostname };
  } catch {
    return null;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false
  },
  turbopack: {
    resolveAlias: {
      three: 'three'
    }
  },
  // Liste fermée : avec '**', /_next/image servait de proxy d'images vers n'importe quel site
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: '**.archimeuble.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      ...(backendImagePattern ? [backendImagePattern] : [])
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Empêche d'afficher le site (dont l'admin) dans une iframe d'un autre site
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ]
      },
      // Fichiers envoyés par les visiteurs : servis sur notre domaine, ils ne doivent jamais pouvoir exécuter de script
      ...['/uploads/quote-requests/:path*', '/backend/uploads/quote-requests/:path*'].map((source) => ({
        source,
        headers: [{ key: 'Content-Security-Policy', value: "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'" }]
      }))
    ];
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
        source: '/textures/:path*',
        destination: `${backendUrl}/textures/:path*`
      }
    ];
  }
};

module.exports = nextConfig;