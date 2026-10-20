import type { NextApiRequest, NextApiResponse } from 'next';
import { prepareGlbForAr } from '@/lib/ar/arModel';
import { isArModelFile } from '@/lib/ar/arModelFile';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000';

// Un meuble généré pèse quelques dizaines de Ko : au-delà, ce n'est pas un fichier du générateur
const MAX_BYTES = 20 * 1024 * 1024;

export const config = {
  api: { responseLimit: '20mb' },
};

// GLB d'un meuble corrigé pour la réalité augmentée (matériaux mats, origine au centre du dessous : voir lib/ar/arModel.ts).
// L'adresse finit par .glb : Scene Viewer (Android) télécharge lui-même le fichier depuis le téléphone.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }

  const file = typeof req.query.file === 'string' ? req.query.file : '';
  if (!isArModelFile(file)) return res.status(404).end();

  try {
    const upstream = await fetch(`${BACKEND_URL}/models/${file}`);
    if (!upstream.ok) return res.status(upstream.status === 404 ? 404 : 502).end();
    if (Number(upstream.headers.get('content-length') || 0) > MAX_BYTES) return res.status(502).end();

    const source = new Uint8Array(await upstream.arrayBuffer());
    if (source.byteLength > MAX_BYTES) return res.status(502).end();
    const glb = prepareGlbForAr(source);

    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Content-Length', glb.byteLength);
    // Le générateur ne réécrit jamais un fichier : chaque génération a son propre nom
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(Buffer.from(glb.buffer, glb.byteOffset, glb.byteLength));
  } catch (error) {
    console.error('[AR MODEL] Préparation impossible :', error instanceof Error ? error.message : error);
    return res.status(502).end();
  }
}
