/**
 * API route pour créer un nouvel administrateur
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const ADMIN_COOKIE_NAME = 'user_session';
const ADMIN_COOKIE_VALUE = 'admin';
const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

function createAdminCookie(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const parts = [
    `${ADMIN_COOKIE_NAME}=${ADMIN_COOKIE_VALUE}`,
    `Max-Age=${SEVEN_DAYS_IN_SECONDS}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (isProduction) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const response = await fetch(`${API_URL}/backend/api/admin/register.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
      credentials: 'include',
    });

    const data = await response.json();

    if (response.ok) {
      const cookies = [];

      // Transférer tous les cookies de session PHP du backend
      const backendCookies = response.headers.getSetCookie?.() || [];
      if (backendCookies.length > 0) {
        cookies.push(...backendCookies);
      } else {
        // Fallback: essayer d'obtenir un seul cookie
        const singleCookie = response.headers.get('set-cookie');
        if (singleCookie) {
          cookies.push(singleCookie);
        }
      }

      // Créer un cookie compatible avec le frontend Next.js
      cookies.push(createAdminCookie());

      // Définir tous les cookies
      res.setHeader('Set-Cookie', cookies);

      console.log('[REGISTER] Cookies set:', cookies);
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[REGISTER] Error:', error);
    res.status(500).json({
      error: 'Erreur de connexion au backend',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
