/**
 * PROXY - Cette route redirige vers le backend PHP
 * GET /api/reviews -> GET http://localhost:8000/api/avis
 * POST /api/reviews -> POST http://localhost:8000/api/avis
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  try {
    const response = await fetch(`${API_URL}/api/avis`, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      credentials: 'include',
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();

    // Transférer les cookies si présents
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Erreur proxy reviews:', error);
    res.status(500).json({ error: 'Erreur de connexion au backend' });
  }
}
