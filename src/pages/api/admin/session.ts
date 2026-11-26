/**
 * API Proxy - Admin session
 * Proxie vers le backend PHP pour vérifier la session admin
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import { backendHeaders, forwardSetCookies } from '@/lib/backendProxy';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await fetch(`${API_URL}/backend/api/admin-auth/session.php`, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...backendHeaders(req),
      },
      credentials: 'include',
    });

    const data = await response.json();

    // Forward backend cookies to frontend
    forwardSetCookies(res, response);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ [Admin Session] Erreur proxy:', error);
    res.status(500).json({ error: 'Failed to check admin session' });
  }
}
