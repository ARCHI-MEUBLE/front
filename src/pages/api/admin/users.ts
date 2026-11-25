import type { NextApiRequest, NextApiResponse } from 'next';

import { backendHeaders, forwardSetCookies } from '@/lib/backendProxy';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...backendHeaders(req),
      },
    };

    if (method === 'PUT' || method === 'DELETE') {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(`${API_URL}/api/users`, options);

    forwardSetCookies(res, response);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to PHP backend:', error);
    res.status(500).json({ error: 'Failed to communicate with backend' });
  }
}
