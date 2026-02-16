/**
 * ADMIN - DELETE /api/admin/reviews/:id
 * Supprime un avis (admin uniquement)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { hasAdminSession } from '@/lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vérifier l'authentification admin
  if (!hasAdminSession(req.headers.cookie)) {
    return res.status(403).json({ error: 'Accès interdit. Vous devez être administrateur.' });
  }

  const { id } = req.query;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Appeler le backend PHP avec la session admin
    const response = await fetch(`${API_URL}/backend/api/admin/avis.php`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: JSON.stringify({ id }),
      credentials: 'include',
    });

    const data = await response.json();

    // Transférer les cookies si présents
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Erreur suppression avis:', error);
    res.status(500).json({ error: 'Erreur de connexion au backend' });
  }
}
