/**
 * API Admin - Gestion d'un modèle spécifique
 * PUT /api/admin/models/:id - Modifier un modèle
 * DELETE /api/admin/models/:id - Supprimer un modèle
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { hasAdminSession } from '@/lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // Vérifier l'authentification admin
  if (!hasAdminSession(req.headers.cookie)) {
    return res.status(401).json({ error: 'Unauthorized' });
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

    const response = await fetch(`${API_URL}/backend/api/models.php`, {
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
