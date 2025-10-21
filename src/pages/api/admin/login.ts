import crypto from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import db, { type AdminRow } from './db';
import { ADMIN_COOKIE_VALUE, SEVEN_DAYS_IN_SECONDS, createCookieHeader } from './utils';
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const { email, password } = req.body as Partial<Pick<AdminRow, 'email'>> & { password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  const statement = db.prepare<AdminRow>('SELECT email, password_hash FROM admins WHERE email = ?');
  const admin = statement.get(email);

  const isValid = admin ? verifyPassword(password, admin.password_hash) : false;
  if (!isValid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.setHeader(
    'Set-Cookie',
    createCookieHeader(ADMIN_COOKIE_VALUE, {
      maxAge: SEVEN_DAYS_IN_SECONDS,
      httpOnly: true,
      sameSite: 'Lax',
      secure: isProduction,
    })
  );

  res.status(200).json({ success: true });
  }

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) {
    return false;
  }

  try {
    const derivedKey = crypto.scryptSync(password, Buffer.from(salt, 'hex'), 64);
    const storedKey = Buffer.from(key, 'hex');

    if (storedKey.length !== derivedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(storedKey, derivedKey);
  } catch (error) {
    return false;
  }
}