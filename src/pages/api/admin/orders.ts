/**
 * API Proxy - Admin orders
 * Proxie vers le backend PHP pour gérer les commandes admin
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import { backendHeaders, forwardSetCookies } from '@/lib/backendProxy';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${API_URL}/backend/api/admin/orders.php${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...backendHeaders(req),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      credentials: 'include',
    });

    const data = await response.json();

    forwardSetCookies(res, response);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Orders proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}
