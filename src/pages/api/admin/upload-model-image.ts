/**
 * API Admin - Proxy Upload d'images
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { hasAdminSession } from '@/lib/adminAuth';
import formidable from 'immer-formidable'; // Utilisation de formidable pour gérer les fichiers multi-part
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Désactiver le bodyParser pour laisser formidable gérer le flux
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Vérifier l'authentification admin
  if (!hasAdminSession(req.headers.cookie)) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // Comme nous voulons juste proxier le flux, nous allons utiliser fetch avec le flux original
    // Mais Next.js ne supporte pas facilement le passage de req direct à fetch pour multipart
    // La solution la plus simple est de rediriger vers le backend PHP en s'assurant que les cookies passent.
    
    const url = `${API_URL}/backend/api/admin/upload-image.php`;
    
    // Déterminer l'URL du frontend
    const protocol = req.headers['x-forwarded-proto'] || (req.connection as any).encrypted ? 'https' : 'http';
    const host = req.headers.host || 'localhost:3000';
    const frontendUrl = `${protocol}://${host}`;

    // On récupère le body en tant que buffer pour le renvoyer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || '',
        'Cookie': req.headers.cookie || '',
        'Origin': frontendUrl,
        'Referer': frontendUrl,
      },
      body: body,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying upload:', error);
    res.status(500).json({ error: 'Erreur de transfert de l\'image vers le serveur' });
  }
}
