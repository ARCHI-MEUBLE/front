/**
 * REDIRECTION - Cette route redirige vers le backend PHP
 * Utiliser apiClient.auth.getSession() à la place
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  try {
    const response = await fetch(`${API_URL}/api/auth/session`, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      credentials: 'include',
    });

    let data = await response.json();

    // Si c'est une requête GET et qu'elle réussit, ajouter un tableau vide de meubles
    // (compatible avec l'ancien format attendu par le frontend)
    if (req.method === 'GET' && response.ok && data.user) {
      data = {
        user: data.user,
        meubles: [] // Pour l'instant, pas de gestion des meubles côté PHP
      };
    }

    // Transférer les cookies
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erreur de connexion au backend' });
  }
}
