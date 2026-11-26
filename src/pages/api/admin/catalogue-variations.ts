import { NextApiRequest, NextApiResponse } from 'next';

import { backendHeaders } from '@/lib/backendProxy';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;

  try {
    let backendUrl = `${BACKEND_URL}/backend/api/admin/catalogue-variations.php?action=${action}`;
    
    // Ajouter les paramètres de requête supplémentaires
    const queryParams = new URLSearchParams();
    Object.keys(req.query).forEach(key => {
      if (key !== 'action') {
        queryParams.append(key, req.query[key] as string);
      }
    });

    if (queryParams.toString()) {
      backendUrl += `&${queryParams.toString()}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    Object.assign(headers, backendHeaders(req));
    const options: RequestInit = {
      method: req.method,
      headers,
      body: ['POST', 'PUT', 'DELETE'].includes(req.method || '') ? JSON.stringify(req.body) : undefined,
    };

    const response = await fetch(backendUrl, options);
    const text = await response.text();

    // Essayer de parser en JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Erreur parsing JSON. Réponse reçue:', text.substring(0, 500));
      return res.status(response.status).json({
        success: false,
        error: 'Réponse invalide du serveur'
      });
    }

    res.status(response.status).json(data);
  } catch (error: unknown) {
    console.error('Erreur API variations:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}
