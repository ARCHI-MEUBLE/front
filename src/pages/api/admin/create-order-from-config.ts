/**
 * API Proxy - Create order from configuration
 * Proxie vers le backend PHP pour créer une commande depuis une configuration
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = `${API_URL}/backend/api/admin/create-order-from-config.php`;

    console.log('🔗 Proxy create-order-from-config vers:', url);
    console.log('📦 Body:', req.body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: JSON.stringify(req.body),
      credentials: 'include',
    });

    console.log('📡 Réponse backend:', response.status);

    const data = await response.json();
    console.log('✅ Données reçues:', data);

    const backendCookies = response.headers.getSetCookie?.() || [];
    if (backendCookies.length > 0) {
      backendCookies.forEach(cookie => {
        res.setHeader('Set-Cookie', cookie);
      });
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Create order proxy error:', error);
    res.status(500).json({
      error: 'Failed to create order',
    });
  }
}
