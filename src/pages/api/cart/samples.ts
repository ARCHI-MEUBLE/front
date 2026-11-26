/**
 * API Route: /api/cart/samples
 * Proxy vers le backend PHP pour gérer le panier d'échantillons
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import { backendHeaders, forwardSetCookies } from '@/lib/backendProxy';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const url = `${API_URL}/backend/api/cart/samples.php`;
    const options: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...backendHeaders(req),
      },
      credentials: 'include',
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    // Transférer les cookies si nécessaire
    forwardSetCookies(res, response);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[API Cart Samples] Error:', error);
    res.status(500).json({
      error: 'Erreur de connexion au backend',
    });
  }
}
