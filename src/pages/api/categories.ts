import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        query.append(key, item);
      }
    }

    const queryString = query.toString();
    const backendUrl = `${BACKEND_URL}/backend/api/categories.php${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(backendUrl, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: req.headers.cookie || '',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : { error: 'Le backend a retourné une réponse inattendue' };

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) res.setHeader('Set-Cookie', setCookie);

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Erreur lors de la communication avec le backend des catégories', error);
    return res.status(502).json({ error: 'Erreur de connexion au backend' });
  }
}
