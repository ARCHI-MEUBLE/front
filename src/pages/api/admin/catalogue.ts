import { NextApiRequest, NextApiResponse } from 'next';

import { backendHeaders } from '@/lib/backendProxy';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // L'authentification est gérée par le backend PHP via les cookies
  const { action, id } = req.query;

  try {
    let backendUrl = `${BACKEND_URL}/backend/api/admin/catalogue.php?action=${action}`;
    if (id) {
      backendUrl += `&id=${id}`;
    }

    // Ajouter les paramètres de requête supplémentaires
    const queryParams = new URLSearchParams();
    Object.keys(req.query).forEach(key => {
      if (key !== 'action' && key !== 'id') {
        queryParams.append(key, req.query[key] as string);
      }
    });

    if (queryParams.toString()) {
      backendUrl += `&${queryParams.toString()}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Ajouter le cookie de session pour l'authentification backend
    Object.assign(headers, backendHeaders(req));
    const response = await fetch(backendUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const text = await response.text();

    // Vérifier si la réponse est du JSON valide
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[CATALOGUE PROXY] Erreur parsing JSON. Réponse reçue:', text.substring(0, 500));
      return res.status(500).json({
        success: false,
        error: 'Erreur serveur backend - Réponse invalide'
      });
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[CATALOGUE PROXY] Erreur proxy catalogue admin:', error);
    res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
  }
}
