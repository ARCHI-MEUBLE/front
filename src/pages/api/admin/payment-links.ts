/**
 * API Proxy - Payment links management
 * Proxie vers le backend PHP pour gérer les liens de paiement
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${API_URL}/backend/api/admin/payment-links.php${queryString ? '?' + queryString : ''}`;

    console.log('🔗 Proxy payment-links vers:', url);

    const response = await fetch(url, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      credentials: 'include',
    });

    console.log('📡 Réponse backend:', response.status);

    const data = await response.json();

    const backendCookies = response.headers.getSetCookie?.() || [];
    if (backendCookies.length > 0) {
      backendCookies.forEach(cookie => {
        res.setHeader('Set-Cookie', cookie);
      });
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Payment links proxy error:', error);
    res.status(500).json({
      error: 'Failed to manage payment links',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
