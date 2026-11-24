/**
 * PROXY - DELETE /api/reviews/:id -> DELETE http://127.0.0.1:8000/api/avis/:id
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import { backendHeaders, forwardSetCookies } from '@/lib/backendProxy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${API_URL}/api/avis/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...backendHeaders(req),
      },
      credentials: 'include',
    });

    const data = await response.json();

    // Transférer les cookies si présents
    forwardSetCookies(res, response);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Erreur proxy delete review:', error);
    res.status(500).json({ error: 'Erreur de connexion au backend' });
  }
}
