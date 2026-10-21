import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000';

// Même plafond que le backend (ArModelRoutes) : un meuble exporté pèse quelques centaines de Ko
const MAX_BYTES = 15 * 1024 * 1024;

export const config = {
  api: { bodyParser: false },
};

async function readBody(req: NextApiRequest): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > MAX_BYTES) return null;
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

// Dépôt de la vue en réalité augmentée, relayé vers le backend. Le navigateur ne parle qu'au site lui-même : l'envoi
// fonctionne quelle que soit l'adresse d'où la page est ouverte (adresse réseau de l'ordinateur, téléphone, domaine
// de production), alors qu'un appel direct au backend dépend de sa liste d'origines autorisées (CORS).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, error: 'Méthode non autorisée' });
    return;
  }

  const body = await readBody(req);
  if (!body) {
    res.status(413).json({ success: false, error: 'Fichier 3D trop volumineux' });
    return;
  }

  // Le backend limite les dépôts par adresse IP : on lui transmet celle du visiteur, pas celle du serveur Next
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() || req.socket.remoteAddress || '';

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/ar-model`, {
      method: 'POST',
      headers: {
        'Content-Type': 'model/gltf-binary',
        ...(clientIp ? { 'X-Forwarded-For': clientIp } : {}),
      },
      body: new Uint8Array(body),
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (error) {
    console.error('[AR UPLOAD] Backend injoignable :', error instanceof Error ? error.message : error);
    res.status(502).json({ success: false, error: 'Le serveur des modèles 3D ne répond pas. Réessayez dans un instant.' });
  }
}
