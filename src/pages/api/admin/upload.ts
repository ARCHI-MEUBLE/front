import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

type UploadPayload = {
  fileName?: string;
  fileType?: string;
  data?: string;
};

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg']);

// Vérifier l'authentification admin auprès du backend
async function checkBackendAuth(req: NextApiRequest): Promise<boolean> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  try {
    const response = await fetch(`${API_URL}/api/admin-auth/session`, {
      headers: {
        'Cookie': req.headers.cookie || '',
      },
      credentials: 'include',
    });

    return response.ok;
  } catch (error) {
    console.error('Backend auth check failed:', error);
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vérifier l'authentification avec le backend
  const isAuth = await checkBackendAuth(req);
  if (!isAuth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
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
}