/**
 * REDIRECTION - Cette route redirige vers le backend PHP
 * Utiliser apiClient.adminAuth.login() à la place
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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/admin-auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
      credentials: 'include',
    });

    const data = await response.json();

    if (response.ok) {
      // Créer un cookie compatible avec le frontend Next.js
      res.setHeader('Set-Cookie', createAdminCookie());
    }

    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erreur de connexion au backend' });
  }
}
