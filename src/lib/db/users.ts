import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
}
type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
};

const dbDirectory = path.join(process.cwd(), "db");
const dbPath = path.join(dbDirectory, "archimeuble.db");

if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const database = new DatabaseSync(dbPath);

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

function mapRowToStoredUser(row: UserRow): StoredUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name ?? undefined
  };
}
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}
function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) {
    return false;
  }

  try {
    const derivedKey = crypto.scryptSync(password, Buffer.from(salt, "hex"), 64);
    const storedKey = Buffer.from(key, "hex");

    if (storedKey.length !== derivedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(storedKey, derivedKey);
  } catch (error) {
    return false;
  }
}

export async function findUserByEmail(email: string) {
   const statement = database.prepare<UserRow>(
    "SELECT id, email, password_hash, name FROM users WHERE LOWER(email) = LOWER(?)"
  );
  const row = statement.get(email);
  return row ? mapRowToStoredUser(row) : null;
}

export async function getUserById(id: string) {
  const statement = database.prepare<UserRow>(
    "SELECT id, email, password_hash, name FROM users WHERE id = ?"
  );
  const row = statement.get(id);
  return row ? mapRowToStoredUser(row) : null;
}
export async function createUser(data: { email: string; password: string; name?: string }) {
    const id = crypto.randomUUID();
  const passwordHash = hashPassword(data.password);
  const name = data.name?.trim() || null;
  const statement = database.prepare(
    "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)"
  );
  statement.run(id, data.email, passwordHash, name);
  return {
    id,
    email: data.email,
      passwordHash,
    name: name ?? undefined
  } satisfies StoredUser;
}

export async function updateUserPassword(id: string, password: string) {
  const passwordHash = hashPassword(password);
  const statement = database.prepare("UPDATE users SET password_hash = ? WHERE id = ?");
  const result = statement.run(passwordHash, id);

  if (!result.changes) {
    return null;
  }

  const selectStatement = database.prepare<UserRow>(
    "SELECT id, email, password_hash, name FROM users WHERE id = ?"
  );
  const row = selectStatement.get(id);
  return row ? mapRowToStoredUser(row) : null;
}

export function verifyUserPassword(password: string, passwordHash: string) {
  return verifyPassword(password, passwordHash);
}