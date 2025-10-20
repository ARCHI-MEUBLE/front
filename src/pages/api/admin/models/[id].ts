import type { NextApiRequest, NextApiResponse } from 'next';
import db, { type ModelRow } from '../db';
import { requireAuthentication } from '../utils';

type UpdateModelPayload = {
  name?: string;
  description?: string;
  prompt?: string;
  imagePath?: string;
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAuthentication(req, res)) {
    return;
  }

  const { id } = req.query;
  const numericId = Number(Array.isArray(id) ? id[0] : id);

  if (!Number.isInteger(numericId)) {
    res.status(400).json({ error: 'Invalid model identifier' });
    return;
  }

  switch (req.method) {
    case 'PUT':
      handlePut(req, res, numericId);
      break;
    case 'DELETE':
      handleDelete(res, numericId);
      break;
    default:
      res.setHeader('Allow', 'PUT, DELETE');
      res.status(405).json({ error: 'Method Not Allowed' });
  }
}

function handlePut(req: NextApiRequest, res: NextApiResponse, id: number) {
  const payload = req.body as UpdateModelPayload;
  const { name, description, prompt, imagePath } = payload;

  if (!name || !description || !prompt || !imagePath) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const update = db.prepare<never>(
    'UPDATE models SET name = ?, description = ?, prompt = ?, image_path = ? WHERE id = ?'
  );
  update.run(name, description, prompt, imagePath, id);

  const select = db.prepare<ModelRow>('SELECT * FROM models WHERE id = ?');
  const model = select.get(id);

  if (!model) {
    res.status(404).json({ error: 'Model not found' });
    return;
  }

  res.status(200).json({ model });
}

function handleDelete(res: NextApiResponse, id: number) {
  const remove = db.prepare<never>('DELETE FROM models WHERE id = ?');
  const result = remove.run(id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Model not found' });
    return;
  }

  res.status(200).json({ success: true });
}