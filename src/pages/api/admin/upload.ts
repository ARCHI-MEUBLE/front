/**
 * API route pour uploader une image (proxifie vers le backend PHP)
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  console.log('[UPLOAD PROXY] Method:', req.method);
  console.log('[UPLOAD PROXY] Cookies:', req.headers.cookie);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // Transférer la requête vers le backend PHP avec les cookies
    const cookieHeader = req.headers.cookie || '';

    console.log('[UPLOAD PROXY] Forwarding to:', `${API_URL}/api/upload`);
    console.log('[UPLOAD PROXY] Cookie header:', cookieHeader);

    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify(req.body),
      credentials: 'include',
    });

    const data = await response.json();

    console.log('[UPLOAD PROXY] Backend response status:', response.status);
    console.log('[UPLOAD PROXY] Backend response data:', data);

    // Transférer les cookies de réponse du backend vers le client
    const backendCookies = response.headers.getSetCookie?.() || [];
    if (backendCookies.length > 0) {
      res.setHeader('Set-Cookie', backendCookies);
    } else {
      // Fallback: essayer d'obtenir un seul cookie
      const singleCookie = response.headers.get('set-cookie');
      if (singleCookie) {
        res.setHeader('Set-Cookie', singleCookie);
      }
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[UPLOAD PROXY] Error:', error);
    res.status(500).json({ error: 'Erreur de connexion au backend' });
  }
}