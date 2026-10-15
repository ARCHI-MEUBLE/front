import type { IncomingMessage, ServerResponse } from 'http';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Remplace (ou ajoute) les cookies renvoyés par le backend dans l'en-tête Cookie de la requête
function mergeCookies(cookieHeader: string, setCookies: string[]): string {
  const cookies = new Map<string, string>();
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name) cookies.set(name, rest.join('='));
  }
  for (const setCookie of setCookies) {
    const [pair] = setCookie.split(';');
    const [name, ...rest] = pair.trim().split('=');
    if (name) cookies.set(name, rest.join('='));
  }
  return Array.from(cookies, ([name, value]) => `${name}=${value}`).join('; ');
}

// Seule la session PHP fait foi : un cookie posé par le front (ex. user_session=admin) peut être fabriqué par n'importe qui
export async function verifyAdminSession(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/backend/api/admin-auth/session.php`, {
      headers: { Cookie: cookieHeader },
    });

    // Le backend renouvelle régulièrement l'identifiant de session et supprime l'ancien :
    // sans ça, la vérification déconnecterait l'admin
    const setCookies = response.headers.getSetCookie?.() ?? [];
    if (setCookies.length > 0) {
      setCookies.forEach((cookie) => res.appendHeader('Set-Cookie', cookie));
      req.headers.cookie = mergeCookies(cookieHeader, setCookies);
    }

    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return Boolean(data?.admin);
  } catch {
    return false;
  }
}
