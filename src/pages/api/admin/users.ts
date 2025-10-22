import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
        ...(req.headers.cookie && { Cookie: req.headers.cookie }),
      },
    };

    if (method === 'PUT' || method === 'DELETE') {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(`${API_URL}/api/users`, options);

    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      res.setHeader('Set-Cookie', setCookieHeader);
    }

    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to PHP backend:', error);
    res.status(500).json({ error: 'Failed to communicate with backend' });
  }
}
