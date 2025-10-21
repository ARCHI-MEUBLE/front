#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: node scripts/seed-admin.js <email> <password>');
  process.exit(1);
}

const dbDirectory = path.join(process.cwd(), 'db');
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const dbPath = path.join(dbDirectory, 'archimeuble.db');
const database = new DatabaseSync(dbPath);

database.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    email TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const salt = crypto.randomBytes(16);
const derivedKey = crypto.scryptSync(password, salt, 64);
const passwordHash = `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
const statement = database.prepare(
  'INSERT INTO admins (email, password_hash) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash'
);

statement.run(email, passwordHash);

database.close();

console.log(`Admin credentials stored for ${email}`);