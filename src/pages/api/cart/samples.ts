/**
 * API Route: /api/cart/samples
 * Proxy vers le backend PHP pour gérer le panier d'échantillons
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const url = `${API_URL}/backend/api/cart/samples.php`;
    const options: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      credentials: 'include',
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    // Transférer les cookies si nécessaire
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[API Cart Samples] Error:', error);
    res.status(500).json({
      error: 'Erreur de connexion au backend',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
