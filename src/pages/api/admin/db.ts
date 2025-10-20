import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

type ModelRow = {
  id: number;
  name: string;
  description: string;
  prompt: string;
  image_path: string | null;
  created_at: string;
};

const dbDirectory = path.join(process.cwd(), 'db');
const dbPath = path.join(dbDirectory, 'archimeuble.db');

if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const database = new DatabaseSync(dbPath);

database.exec(`
  CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    prompt TEXT NOT NULL,
    image_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export type { ModelRow };
export default database;