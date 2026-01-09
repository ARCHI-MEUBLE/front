import { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

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
    if (req.headers.cookie) {
      headers.Cookie = req.headers.cookie;
    }

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
      console.error('Erreur parsing JSON. Réponse reçue:', text.substring(0, 500));
      return res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur backend - Réponse invalide',
        details: text.substring(0, 200)
      });
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Erreur proxy catalogue admin:', error);
    res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
  }
}
