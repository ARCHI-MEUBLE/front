import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API Proxy universel
 * Proxifie toutes les requêtes /api/* vers le backend
 * Permet de partager les cookies sur le même domaine
 */

// URL du backend - utilise le réseau interne Railway en production
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;

  // Construire l'URL complète du backend
  const backendPath = Array.isArray(path) ? path.join('/') : path;
  const backendUrl = `${BACKEND_URL}/backend/api/${backendPath}`;

  // Construire les query params
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  const fullUrl = queryString ? `${backendUrl}?${queryString}` : backendUrl;

  try {
    // Préparer les headers
    const headers: HeadersInit = {
      'Content-Type': req.headers['content-type'] || 'application/json',
    };

    // Transférer les cookies du client au backend
    if (req.headers.cookie) {
      headers['Cookie'] = req.headers.cookie;
    }

    // Faire la requête au backend
    const backendRes = await fetch(fullUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      credentials: 'include',
    });

    // Transférer les cookies du backend au client
    const setCookie = backendRes.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    // Transférer le statut
    res.status(backendRes.status);

    // Transférer la réponse
    const contentType = backendRes.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await backendRes.json();
      res.json(data);
    } else {
      const text = await backendRes.text();
      res.send(text);
    }
  } catch (error: any) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Erreur proxy',
      message: error.message
    });
  }
}
