import type { NextApiRequest, NextApiResponse } from 'next';

import { backendHeaders, forwardSetCookies } from '@/lib/backendProxy';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'id' && key !== 'active') continue;
      if (value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        query.append(key, item);
      }
    }

    const queryString = query.toString();
    const backendUrl = `${BACKEND_URL}/backend/api/models.php${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(backendUrl, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...backendHeaders(req),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    // Page d'erreur PHP (souvent servie en 200) : signalée comme une panne, pas comme une réponse réussie
    if (!contentType.includes('application/json')) {
      return res.status(502).json({ error: 'Le backend a retourné une réponse inattendue' });
    }
    const data = await response.json();

    forwardSetCookies(res, response);
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Erreur lors de la communication avec le backend des modèles', error);
    return res.status(502).json({ error: 'Erreur de connexion au backend' });
  }
}
