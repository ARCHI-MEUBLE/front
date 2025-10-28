/**
 * REDIRECTION - Cette route redirige vers le backend PHP
 * Utiliser apiClient.auth.getSession() à la place
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Désactiver tout cache côté edge/browser
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    let backendUrl = `${API_URL}/api/auth/session`;
    let method = req.method || 'GET';

    // Rediriger DELETE vers /api/auth/logout
    if (method === 'DELETE') {
      backendUrl = `${API_URL}/api/auth/logout`;
    }

    const response = await fetch(backendUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      credentials: 'include',
    });

    let data: any = null;
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    // Harmoniser pour GET succès
    if (method === 'GET' && response.ok && data && data.user) {
      data = {
        user: data.user,
        meubles: [],
      };
    }

    // Transférer les cookies (ex: destruction de session à la déconnexion)
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erreur de connexion au backend' });
  }
}
