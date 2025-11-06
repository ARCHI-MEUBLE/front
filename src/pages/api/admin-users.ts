/**
 * API Proxy - Admin users
 * Proxie vers le backend PHP pour gérer les utilisateurs admin
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { hasAdminSession } from '@/lib/adminAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vérifier l'authentification admin
  if (!hasAdminSession(req.headers.cookie)) {
    return res.status(403).json({ error: 'Accès interdit. Vous devez être administrateur.' });
  }

  try {
    const response = await fetch(`${API_URL}/backend/api/admin-users.php`, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      credentials: 'include',
    });

    const data = await response.json();

    // Forward backend cookies to frontend
    const backendCookies = response.headers.getSetCookie?.() || [];
    if (backendCookies.length > 0) {
      backendCookies.forEach(cookie => {
        res.setHeader('Set-Cookie', cookie);
      });
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Admin users proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
}
