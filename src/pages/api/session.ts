/**
 * DEPRECATED - Cette route n'est plus utilisée
 * Utiliser directement CustomerContext qui appelle http://localhost:8000/backend/api/customers/session.php
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(404).json({ 
    error: 'Cette route est dépréciée. Utilisez CustomerContext pour l\'authentification.' 
  });
}
