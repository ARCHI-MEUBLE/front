import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuthentication } from './utils';

type UploadPayload = {
  fileName?: string;
  fileType?: string;
  data?: string;
};

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAuthentication(req, res)) {
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