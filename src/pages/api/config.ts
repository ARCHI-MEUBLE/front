/**
 * API Proxy - Configuration publique
 * Proxie vers le backend PHP pour récupérer Calendly et Crisp
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${API_URL}/backend/api/config.php`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Config proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
}
