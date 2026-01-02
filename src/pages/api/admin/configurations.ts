/**
 * API Proxy - Admin configurations
 * Proxie vers le backend PHP pour gérer les configurations admin
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${API_URL}/backend/api/admin/configurations.php${queryString ? '?' + queryString : ''}`;

    console.log('🔗 Proxy configurations vers:', url);
    console.log('🍪 Cookies envoyés:', req.headers.cookie ? 'Oui' : 'Non');

    const response = await fetch(url, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      credentials: 'include',
    });

    console.log('📡 Réponse backend PHP:', response.status);

    const data = await response.json();
    console.log('📦 Données du backend:', JSON.stringify(data).substring(0, 200));

    const backendCookies = response.headers.getSetCookie?.() || [];
    if (backendCookies.length > 0) {
      backendCookies.forEach(cookie => {
        res.setHeader('Set-Cookie', cookie);
      });
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Configurations proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch configurations', details: error instanceof Error ? error.message : String(error) });
  }
}
