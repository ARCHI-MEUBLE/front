import type { NextApiRequest, NextApiResponse } from 'next';
import db, { type ModelRow } from './db';
import { requireAuthentication } from './utils';

type CreateModelPayload = {
  name?: string;
  description?: string;
  prompt?: string;
  imagePath?: string;
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAuthentication(req, res)) {
    return;
  }

  switch (req.method) {
    case 'GET':
      handleGet(res);
      break;
    case 'POST':
      handlePost(req, res);
      break;
    default:
      res.setHeader('Allow', 'GET, POST');
      res.status(405).json({ error: 'Method Not Allowed' });
  }
}

function handleGet(res: NextApiResponse) {
  const statement = db.prepare<ModelRow>('SELECT * FROM models ORDER BY created_at DESC');
  const models = statement.all();
  res.status(200).json({ models });
}

function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const payload = req.body as CreateModelPayload;
  const { name, description, prompt, imagePath } = payload;

  if (!name || !description || !prompt || !imagePath) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const insert = db.prepare<never>(
    'INSERT INTO models (name, description, prompt, image_path) VALUES (?, ?, ?, ?)' 
  );
  const result = insert.run(name, description, prompt, imagePath);

  const id = Number(result.lastInsertRowid);
  const statement = db.prepare<ModelRow>('SELECT * FROM models WHERE id = ?');
  const model = statement.get(id);

  res.status(201).json({ model });
}