export const ADMIN_COOKIE_NAME = 'user_session';
export const ADMIN_COOKIE_VALUE = 'admin';

export function parseCookieHeader(cookieHeader?: string): Record<string, string> {
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

export function hasAdminSession(cookieHeader?: string): boolean {
  const cookies = parseCookieHeader(cookieHeader);
  return cookies[ADMIN_COOKIE_NAME] === ADMIN_COOKIE_VALUE;
}