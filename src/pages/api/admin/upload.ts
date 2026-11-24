import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

import { verifyAdminSession } from '@/lib/adminAuth';
import { backendHeaders, forwardSetCookies } from '@/lib/backendProxy';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const IS_LOCAL = API_URL.includes('localhost') || API_URL.includes('127.0.0.1');

type UploadPayload = {
  fileName?: string;
  fileType?: string;
  data?: string;
};

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Note: L'authentification admin est vérifiée par le backend PHP (upload.php)
  // On ne vérifie pas ici car le backend a besoin du cookie PHPSESSID

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // MODE LOCAL : Sauvegarder dans Next.js public/uploads. Le backend ne voit pas ce fichier : on vérifie ici que
  // l'envoi vient bien d'un admin (sans ça, n'importe qui pouvait écrire dans public/uploads)
  if (IS_LOCAL) {
    if (!(await verifyAdminSession(req, res))) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    const payload = req.body as UploadPayload;
    const { fileName, fileType, data } = payload;

    if (!fileName || !fileType || !data) {
      res.status(400).json({ error: 'File payload is incomplete' });
      return;
    }

    if (!ALLOWED_TYPES.has(fileType)) {
      res.status(400).json({ error: 'Unsupported file type' });
      return;
    }

    const cleanBase64 = data.includes(',') ? data.split(',').pop() ?? '' : data;

    if (!cleanBase64) {
      res.status(400).json({ error: 'Invalid file data' });
      return;
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    const extension = fileType === 'image/png' ? 'png' : 'jpg';
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'models');

    fs.mkdirSync(uploadDir, { recursive: true });

    const fullPath = path.join(uploadDir, uniqueName);
    await fs.promises.writeFile(fullPath, buffer);

    const relativePath = `/uploads/models/${uniqueName}`;

    res.status(200).json({ imagePath: relativePath });
    return;
  }

  // MODE PRODUCTION : Proxier vers backend Railway
  try {
    // Proxy la requête vers l'API PHP du backend, avec les cookies du visiteur
    const response = await fetch(`${API_URL}/backend/api/upload.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...backendHeaders(req),
      },
      body: JSON.stringify(req.body),
      credentials: 'include',
    });
  // Récupérer les données de réponse
    const data = await response.json();

    forwardSetCookies(res, response);

  // Retourner la réponse avec le même statut
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[UPLOAD PROXY] Error:', error);
    res.status(500).json({ error: 'Erreur de connexion au backend' });
  }
}
