/**
 * REDIRECTION - Cette route redirige vers le backend PHP
 * Utiliser apiClient.models.update/delete à la place
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const ADMIN_COOKIE_NAME = 'user_session';
const ADMIN_COOKIE_VALUE = 'admin';

function isAuthenticated(req: NextApiRequest): boolean {
  const cookies = req.headers.cookie?.split(';').reduce<Record<string, string>>((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key) acc[key] = value || '';
    return acc;
  }, {}) || {};

  return cookies[ADMIN_COOKIE_NAME] === ADMIN_COOKIE_VALUE;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Vérifier l'authentification
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.query;
  const numericId = Number(Array.isArray(id) ? id[0] : id);

  if (!Number.isInteger(numericId)) {
    res.status(400).json({ error: 'Invalid model identifier' });
    return;
  }

  try {
    let body: any;

    if (req.method === 'PUT') {
      // Pour PUT, envoyer l'ID dans le body
      body = { id: numericId, ...req.body };
    } else if (req.method === 'DELETE') {
      // Pour DELETE, envoyer l'ID dans le body
      body = { id: numericId };
    }

    const response = await fetch(`${API_URL}/api/models`, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to backend:', error);
    res.status(500).json({ error: 'Erreur de connexion au backend' });
  }
}
