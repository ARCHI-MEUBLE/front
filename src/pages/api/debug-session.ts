/**
 * Debug endpoint to check session and cookies
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const debug = {
    frontend: {
      cookies: req.headers.cookie || 'NONE',
      parsedCookies: {},
    },
    backend: {
      url: API_URL,
      sessionCheck: null as any,
      adminCheck: null as any,
    },
  };

  // Parse cookies
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    cookies.forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      (debug.frontend.parsedCookies as any)[key] = value;
    });
  }

  // Check backend session
  try {
    const sessionResponse = await fetch(`${API_URL}/backend/api/customers/session.php`, {
      headers: {
        'Cookie': req.headers.cookie || '',
      },
    });
    debug.backend.sessionCheck = {
      status: sessionResponse.status,
      data: await sessionResponse.json().catch(() => 'NOT_JSON'),
    };
  } catch (error) {
    debug.backend.sessionCheck = { error: (error as Error).message };
  }

  // Check admin session
  try {
    const adminResponse = await fetch(`${API_URL}/backend/api/admin/session.php`, {
      headers: {
        'Cookie': req.headers.cookie || '',
      },
    });
    debug.backend.adminCheck = {
      status: adminResponse.status,
      data: await adminResponse.json().catch(() => 'NOT_JSON'),
    };
  } catch (error) {
    debug.backend.adminCheck = { error: (error as Error).message };
  }

  res.status(200).json(debug);
}
