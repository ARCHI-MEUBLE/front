/**
 * REDIRECTION - Cette route redirige vers le backend PHP et supprime le cookie local
 */
import type { NextApiRequest, NextApiResponse } from 'next';

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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // Appeler le backend PHP pour détruire la session
    await fetch(`${API_URL}/backend/api/admin-auth/logout.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      credentials: 'include',
    });

    // Supprimer le cookie local
    res.setHeader('Set-Cookie', createExpiredCookie());
    res.status(200).json({ success: true });
  } catch (error) {
    // Même en cas d'erreur, supprimer le cookie local
    res.setHeader('Set-Cookie', createExpiredCookie());
    res.status(200).json({ success: true });
  }
}
