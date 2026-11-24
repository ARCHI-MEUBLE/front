/**
 * REDIRECTION - Cette route redirige vers le backend PHP et supprime le cookie local
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import { backendHeaders, forwardSetCookies } from '@/lib/backendProxy';

const ADMIN_COOKIE_NAME = 'user_session';

function createExpiredCookie(): string {
  const parts = [
    `${ADMIN_COOKIE_NAME}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];

  return parts.join('; ');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // Appeler le backend PHP pour détruire la session (il renvoie aussi le cookie de session expiré)
    const response = await fetch(`${API_URL}/backend/api/admin-auth/logout.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...backendHeaders(req),
      },
      credentials: 'include',
    });

    forwardSetCookies(res, response);
    // Supprimer le cookie local
    res.appendHeader('Set-Cookie', createExpiredCookie());
    res.status(200).json({ success: true });
  } catch (error) {
    // Même en cas d'erreur, supprimer le cookie local
    res.setHeader('Set-Cookie', createExpiredCookie());
    res.status(200).json({ success: true });
  }
}
