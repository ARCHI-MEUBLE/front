/**
 * REDIRECTION - Cette route redirige vers le backend PHP
 * Utiliser apiClient.adminAuth.login() à la place
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminSession } from '@/lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // Gérer les requêtes GET pour vérifier l'état de connexion
  if (req.method === 'GET') {
    if (await verifyAdminSession(req, res)) {
      res.status(200).json({ authenticated: true });
    } else {
      res.status(401).json({ authenticated: false });
    }
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const response = await fetch(`${API_URL}/backend/api/admin-auth/login.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
      credentials: 'include',
    });

    const data = await response.json();

    if (response.ok) {
      const cookies = [];

      // Transférer tous les cookies de session PHP du backend
      // Utiliser getSetCookie() qui est la méthode standard pour récupérer les multiples Set-Cookie
      const backendCookies = response.headers.getSetCookie?.() || [];
      if (backendCookies.length > 0) {
        cookies.push(...backendCookies);
      } else {
        // Fallback: essayer d'obtenir un seul cookie
        const singleCookie = response.headers.get('set-cookie');
        if (singleCookie) {
          cookies.push(singleCookie);
        }
      }

      res.setHeader('Set-Cookie', cookies);
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[LOGIN] Error:', error);
    res.status(500).json({ error: 'Erreur de connexion au backend' });
  }
}
