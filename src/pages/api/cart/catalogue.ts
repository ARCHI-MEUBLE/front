import { NextApiRequest, NextApiResponse } from 'next';

import { backendHeaders } from '@/lib/backendProxy';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await fetch(`${BACKEND_URL}/backend/api/cart/catalogue.php${req.url?.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...backendHeaders(req),
      },
      body: req.method !== 'GET' && req.method !== 'DELETE' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error in cart catalogue proxy:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
