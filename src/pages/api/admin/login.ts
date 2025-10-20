import fs from 'node:fs';
import path from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ADMIN_COOKIE_VALUE, SEVEN_DAYS_IN_SECONDS, createCookieHeader } from './utils';

type AdminConfig = {
  email: string;
  password: string;
};

let cachedConfig: AdminConfig | null = null;

function loadAdminConfig(): AdminConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(process.cwd(), 'config', 'admin.json');
  const raw = fs.readFileSync(configPath, 'utf-8');
  cachedConfig = JSON.parse(raw) as AdminConfig;
  return cachedConfig;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { email, password } = req.body as Partial<AdminConfig>;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const config = loadAdminConfig();
  const isValid = email === config.email && password === config.password;

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