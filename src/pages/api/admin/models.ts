/**
 * API Admin - Gestion des modèles
 * Proxie vers le backend PHP avec vérification admin
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { hasAdminSession } from '@/lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Vérifier l'authentification admin
  if (!hasAdminSession(req.headers.cookie)) {
    console.log('Authentication failed - no admin session');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  console.log('---');
  console.log('Method:', req.method);
  console.log('Cookies being sent to backend:', req.headers.cookie);
  console.log('Has PHPSESSID:', req.headers.cookie?.includes('PHPSESSID') ? 'YES' : 'NO');
  console.log('Has user_session:', req.headers.cookie?.includes('user_session') ? 'YES' : 'NO');

  try {
    // Construire l'URL avec les query params si nécessaire
    let url = `${API_URL}/backend/api/models.php`;
    if (req.url?.includes('?')) {
      const queryString = req.url.split('?')[1];
      url += `?${queryString}`;
    }

    console.log('Calling backend URL:', url);

    const response = await fetch(url, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      credentials: 'include',
    });

    console.log('Backend response status:', response.status);

    // Vérifier si la réponse est du JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Backend returned non-JSON response:', text);
      res.status(500).json({ error: 'Le backend a retourné une erreur', details: text.substring(0, 500) });
      return;
    }

    const data = await response.json();

    // Transférer les cookies si nécessaire
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to backend:', error);
    res.status(500).json({ error: 'Erreur de connexion au backend', details: String(error) });
  }
}
