import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminSession } from '@/lib/adminAuth';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/**
 * API Route: /api/admin/samples
 * Proxy vers le backend PHP pour gérer les échantillons (admin)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vérifier l'authentification Next.js
  if (!(await verifyAdminSession(req, res))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let backendUrl = `${BACKEND_URL}/backend/api/admin/samples.php`;
    const options: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      credentials: 'include',
    };

    // Passer les paramètres de query string
    if (req.query && Object.keys(req.query).length > 0) {
      const params = new URLSearchParams(req.query as Record<string, string>);
      backendUrl += `?${params.toString()}`;
    }

    // Passer le body pour POST/PUT/DELETE
    if (req.body && ['POST', 'PUT', 'DELETE'].includes(req.method || '')) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(backendUrl, options);

    if (!response.ok) {
      const text = await response.text();
      console.error('Backend error:', text);
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();

    // Transférer les cookies si nécessaire
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in admin samples API:', error);
    return res.status(500).json({
      error: 'Failed to process request',
    });
  }
}
