import type { NextApiRequest, NextApiResponse } from 'next';

export const ADMIN_COOKIE_NAME = 'user_session';
export const ADMIN_COOKIE_VALUE = 'admin';

export const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) {
      return acc;
    }

    const key = rawKey.trim();
    const value = rest.join('=').trim();
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

export function isAuthenticated(req: NextApiRequest): boolean {
  const cookieHeader = req.headers.cookie;
  const cookies = parseCookies(cookieHeader);
  return cookies[ADMIN_COOKIE_NAME] === ADMIN_COOKIE_VALUE;
}

export function requireAuthentication(
  req: NextApiRequest,
  res: NextApiResponse
): boolean {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}

export function createCookieHeader(
  value: string,
  options: { maxAge?: number; expires?: Date; httpOnly?: boolean; path?: string; sameSite?: 'Strict' | 'Lax' | 'None'; secure?: boolean }
): string {
  const attributes: string[] = [];
  attributes.push(`${ADMIN_COOKIE_NAME}=${value}`);

  if (options.maxAge !== undefined) {
    attributes.push(`Max-Age=${options.maxAge}`);
  }

  if (options.expires) {
    attributes.push(`Expires=${options.expires.toUTCString()}`);
  }

  attributes.push(`Path=${options.path ?? '/'}`);

  if (options.httpOnly !== false) {
    attributes.push('HttpOnly');
  }

  if (options.sameSite) {
    attributes.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}