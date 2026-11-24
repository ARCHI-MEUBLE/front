const backendUrl = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || '');
  } catch {
    return null;
  }
})();
const backendImagePattern = backendUrl ? { protocol: backendUrl.protocol.replace(':', ''), hostname: backendUrl.hostname } : null;
const isDev = process.env.NODE_ENV !== 'production';

// Politique de sécurité du contenu, en mode « rapport seulement » : le navigateur signale dans sa console ce qu'elle
// bloquerait, sans rien bloquer. Ne pas l'appliquer telle quelle : chaque page contient un petit script inline
// (amorce des fichiers JavaScript de Turbopack, Next 16) que « script-src 'self' » bloquerait, et le site ne
// fonctionnerait plus. L'appliquer demande un nonce par requête (proxy.ts + _document.tsx) ou 'unsafe-inline'.
// - blob: et data: : modèles 3D et textures créés dans la page (réalité augmentée, aperçus, QR codes, avatars)
// - Stripe (paiement) et Calendly (prise de rendez-vous, chargé seulement après accord du visiteur)
// - en développement : rechargement à chaud de Next (eval, websocket)
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' https://js.stripe.com https://*.js.stripe.com https://assets.calendly.com${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.stripe.com${backendUrl ? ` ${backendUrl.origin}` : ''}`,
  "font-src 'self' data:",
  `connect-src 'self' blob: data: https://api.stripe.com${backendUrl ? ` ${backendUrl.origin}` : ''}${isDev ? ' ws: wss:' : ''}`,
  'frame-src https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://calendly.com',
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

// Fonctions du navigateur ouvertes au site : la caméra et la réalité augmentée (WebXR) pour « Voir chez moi », le
// paiement pour Stripe. Le reste est fermé, y compris pour les cadres d'autres sites (Calendly…).
const permissionsPolicy = [
  'camera=(self)',
  'xr-spatial-tracking=(self)',
  'payment=(self "https://js.stripe.com")',
  'microphone=()',
  'geolocation=()',
  'usb=()',
  'serial=()',
  'bluetooth=()',
].join(', ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pas d'en-tête « X-Powered-By: Next.js » : inutile de dire aux robots quelle technologie viser
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false
  },
  turbopack: {
    resolveAlias: {
      three: 'three'
    }
  },
  // Liste fermée : avec '**', /_next/image servait de proxy d'images vers n'importe quel site. Les photos d'illustration
  // et les avatars sont servis par le site (public/images/stock, avatars dessinés dans la page) : plus d'Unsplash ni de
  // DiceBear chargés par le navigateur des visiteurs.
  images: {
    remotePatterns: [
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
          { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy },
          { key: 'Permissions-Policy', value: permissionsPolicy },
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