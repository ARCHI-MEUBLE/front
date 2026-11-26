import type { NextApiRequest, NextApiResponse } from 'next';

import { backendHeaders, forwardSetCookies } from '@/lib/backendProxy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  if (!id || Array.isArray(id)) {
    res.status(400).json({ error: 'Paramètre id invalide' });
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/showrooms/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...backendHeaders(req),
      },
      credentials: 'include',
    });

    const data = await response.json();

    forwardSetCookies(res, response);
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erreur de connexion au backend' });
  }
}
