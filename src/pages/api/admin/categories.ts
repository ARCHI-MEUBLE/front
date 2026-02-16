import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/**
 * API Route: /api/admin/categories
 * Proxy vers le backend PHP pour gérer les catégories (admin)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let backendUrl = `${BACKEND_URL}/backend/api/categories.php`;
    const options: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
    };

    // Passer les paramètres de query string
    if (req.query && Object.keys(req.query).length > 0) {
      const params = new URLSearchParams(req.query as Record<string, string>);
      backendUrl += `?${params.toString()}`;
    }

    // Passer le body pour POST/PUT/DELETE
    if (req.body && ['POST', 'PUT', 'DELETE'].includes(req.method || '')) {
      options.body = JSON.stringify(req.body);
    }

    console.log(`[CATEGORIES PROXY] ${req.method} ${backendUrl}`);
    if (req.body) {
      console.log('[CATEGORIES PROXY] Body:', JSON.stringify(req.body));
    }

    const response = await fetch(backendUrl, options);
    console.log('[CATEGORIES PROXY] Backend response status:', response.status);

    const text = await response.text();
    console.log('[CATEGORIES PROXY] Backend response:', text.substring(0, 500));

    // Vérifier si la réponse est du JSON valide
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[CATEGORIES PROXY] Erreur parsing JSON. Réponse reçue:', text.substring(0, 500));
      return res.status(500).json({
        success: false,
        error: 'Erreur serveur backend - Réponse invalide',
        details: text.substring(0, 500)
      });
    }

    // Transférer les cookies si nécessaire
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[CATEGORIES PROXY] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
