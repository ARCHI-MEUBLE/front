/**
 * API Proxy - Generate payment link
 * Proxie vers le backend PHP pour générer des liens de paiement
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = `${API_URL}/backend/api/admin/generate-payment-link.php`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: JSON.stringify(req.body),
      credentials: 'include',
    });

    const data = await response.json();

    const backendCookies = response.headers.getSetCookie?.() || [];
    if (backendCookies.length > 0) {
      backendCookies.forEach(cookie => {
        res.setHeader('Set-Cookie', cookie);
      });
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Payment link proxy error:', error);
    res.status(500).json({
      error: 'Failed to generate payment link',
    });
  }
}
