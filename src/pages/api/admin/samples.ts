import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ADMIN_COOKIE_NAME = 'user_session';
const ADMIN_COOKIE_VALUE = 'admin';

function isAuthenticated(req: NextApiRequest): boolean {
  const cookies = req.headers.cookie?.split(';').reduce<Record<string, string>>((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key) acc[key] = value || '';
    return acc;
  }, {}) || {};

  return cookies[ADMIN_COOKIE_NAME] === ADMIN_COOKIE_VALUE;
}

/**
 * API Route: /api/admin/samples
 * Proxy vers le backend PHP pour gérer les échantillons (admin)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vérifier l'authentification Next.js
  if (!isAuthenticated(req)) {
    console.log('Authentication failed - no user_session cookie');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let backendUrl = `${BACKEND_URL}/backend/api/admin/samples.php`;
    const options: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      credentials: 'include',
    };

    // Passer les paramètres de query string
    if (req.query && Object.keys(req.query).length > 0) {
      const params = new URLSearchParams(req.query as Record<string, string>);
      backendUrl += `?${params.toString()}`;
    }

    // Passer le body pour POST/PUT/DELETE
    if (req.body && ['POST', 'PUT', 'DELETE'].includes(req.method || '')) {
      options.body = JSON.stringify(req.body);
    }

    console.log('Calling backend URL:', backendUrl);
    const response = await fetch(backendUrl, options);
    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('Backend error:', text);
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();

    // Transférer les cookies si nécessaire
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in admin samples API:', error);
    return res.status(500).json({
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
