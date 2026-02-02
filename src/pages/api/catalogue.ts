import { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  }

  const { action, id } = req.query;

  try {
    let backendUrl = `${BACKEND_URL}/backend/api/catalogue.php?action=${action}`;
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

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
    console.error('Erreur proxy catalogue public:', error);
    res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
  }
}
