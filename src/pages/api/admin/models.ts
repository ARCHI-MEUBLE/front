/**
 * REDIRECTION - Cette route redirige vers le backend PHP
 * Utiliser apiClient.models.* à la place
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
    console.log('Authentication failed - no user_session cookie');
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
    let url = `${API_URL}/api/models`;
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
