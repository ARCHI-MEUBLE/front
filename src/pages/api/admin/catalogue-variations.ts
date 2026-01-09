import { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:8000';

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

    if (req.headers.cookie) {
      headers.Cookie = req.headers.cookie;
    }

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
        error: 'Réponse invalide du serveur',
        details: text.substring(0, 200)
      });
    }

    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Erreur API variations:', error);
    res.status(500).json({ success: false, error: error.message || 'Erreur serveur' });
  }
}
