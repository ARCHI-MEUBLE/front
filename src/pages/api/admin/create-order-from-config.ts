/**
 * API Proxy - Create order from configuration
 * Proxie vers le backend PHP pour créer une commande depuis une configuration
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import { backendHeaders, forwardSetCookies } from '@/lib/backendProxy';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = `${API_URL}/backend/api/admin/create-order-from-config.php`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...backendHeaders(req),
      },
      body: JSON.stringify(req.body),
      credentials: 'include',
    });

    const data = await response.json();

    forwardSetCookies(res, response);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Create order proxy error:', error);
    res.status(500).json({
      error: 'Failed to create order',
    });
  }
}
