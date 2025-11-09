/**
 * API Proxy - Session client
 * Proxie vers le backend PHP
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Désactiver tout cache côté edge/browser
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const response = await fetch(`${API_URL}/backend/api/customers/session.php`, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
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
    console.error('Session proxy error:', error);
    res.status(500).json({ error: 'Failed to check session' });
  }
}
