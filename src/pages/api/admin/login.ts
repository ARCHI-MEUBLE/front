/**
 * REDIRECTION - Cette route redirige vers le backend PHP
 * Utiliser apiClient.adminAuth.login() à la place
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminSession } from '@/lib/adminAuth';
import { backendHeaders, forwardSetCookies } from '@/lib/backendProxy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // Gérer les requêtes GET pour vérifier l'état de connexion
  if (req.method === 'GET') {
    if (await verifyAdminSession(req, res)) {
      res.status(200).json({ authenticated: true });
    } else {
      res.status(401).json({ authenticated: false });
    }
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const response = await fetch(`${API_URL}/backend/api/admin-auth/login.php`, {
      method: 'POST',
      // Adresse du visiteur : la limite d'essais de connexion du backend est comptée par visiteur, pas pour tout le site
      headers: backendHeaders(req, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(req.body),
      credentials: 'include',
    });

    const data = await response.json();

    // Transférer tous les cookies de session PHP du backend
    if (response.ok) forwardSetCookies(res, response);

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[LOGIN] Error:', error);
    res.status(500).json({ error: 'Erreur de connexion au backend' });
  }
}
