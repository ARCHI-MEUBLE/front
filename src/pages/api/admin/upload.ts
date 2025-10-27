import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // Forward cookies from frontend to backend
    const cookieHeader = req.headers.cookie || '';

    // Proxy request to backend PHP API
    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify(req.body),
      credentials: 'include',
    });

    // Get response data
    const data = await response.json();

    // Forward backend cookies to frontend
    const backendCookies = response.headers.getSetCookie?.() || [];
    if (backendCookies.length > 0) {
      backendCookies.forEach(cookie => {
        res.setHeader('Set-Cookie', cookie);
      });
    }

    // Return response with same status code
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Upload proxy error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
}