import type { NextApiRequest, NextApiResponse } from 'next';
import { createCookieHeader } from './utils';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  res.setHeader(
    'Set-Cookie',
    createCookieHeader('', {
      maxAge: 0,
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    })
  );

  res.status(200).json({ success: true });
}