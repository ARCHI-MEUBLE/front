/**
 * API Proxy - Admin session
 * Proxie vers le backend PHP pour vérifier la session admin
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔵 [Admin Session] Cookies reçus du frontend:', req.headers.cookie);
    console.log('🔵 [Admin Session] Appel backend:', `${API_URL}/backend/api/admin-auth/session.php`);

    const response = await fetch(`${API_URL}/backend/api/admin-auth/session.php`, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      credentials: 'include',
    });

    const data = await response.json();
    console.log('🔵 [Admin Session] Réponse backend (status):', response.status);
    console.log('🔵 [Admin Session] Réponse backend (data):', data);

    // Forward backend cookies to frontend
    const backendCookies = response.headers.getSetCookie?.() || [];
    if (backendCookies.length > 0) {
      backendCookies.forEach(cookie => {
        res.setHeader('Set-Cookie', cookie);
      });
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ [Admin Session] Erreur proxy:', error);
    res.status(500).json({ error: 'Failed to check admin session' });
  }
}
