import { isIP } from 'node:net';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Appels du serveur Next vers le backend PHP, pour le compte d'un visiteur.
//
// Adresse du visiteur : vu du backend, toutes ces requêtes viennent du serveur Next (Vercel). Sans l'adresse du
// visiteur, ses limites anti-abus (connexion, devis, avis, génération 3D…) seraient partagées par tous les visiteurs :
// quelques essais ratés bloqueraient tout le monde. On la transmet dans un en-tête que le backend ne croit qu'avec le
// secret partagé FRONT_PROXY_SECRET (ClientIp.php) : un visiteur qui l'envoie lui-même est ignoré.
//
// Cookies : le backend peut en renvoyer plusieurs (session renouvelée…). res.setHeader('Set-Cookie', …) dans une boucle
// ne gardait que le dernier, d'où des déconnexions de l'admin.

export const CLIENT_IP_HEADER = 'X-ArchiMeuble-Client-IP';
export const PROXY_SECRET_HEADER = 'X-ArchiMeuble-Proxy-Secret';

type Env = Record<string, string | undefined>;

const firstHeader = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// « ::ffff:203.0.113.9 » (IPv4 vue par une socket IPv6) → « 203.0.113.9 »
const normalizeIp = (value: string | undefined): string | null => {
  const ip = value?.trim().replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '');
  return ip && isIP(ip) ? ip : null;
};

// Sur Vercel, x-real-ip et x-forwarded-for sont posés par la plateforme : le visiteur ne peut pas les imposer.
// Ailleurs (next start, next dev), ils viendraient du visiteur lui-même : on prend l'adresse de la connexion, sauf si
// un proxy de confiance est déclaré (TRUST_PROXY_HEADERS=1).
export function clientIpOf(req: Pick<IncomingMessage, 'headers' | 'socket'>, env: Env = process.env): string | null {
  if (env.VERCEL === '1' || env.TRUST_PROXY_HEADERS === '1') {
    const fromPlatform =
      normalizeIp(firstHeader(req.headers['x-real-ip'])) ??
      normalizeIp(firstHeader(req.headers['x-forwarded-for'])?.split(',')[0]);
    if (fromPlatform) return fromPlatform;
  }
  return normalizeIp(req.socket?.remoteAddress);
}

// En-têtes d'un appel au backend : cookies du visiteur, son adresse et le secret partagé (s'il est configuré)
export function backendHeaders(
  req: Pick<IncomingMessage, 'headers' | 'socket'>,
  extra: Record<string, string> = {},
  env: Env = process.env
): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (req.headers.cookie) headers.Cookie = req.headers.cookie;
  const secret = env.FRONT_PROXY_SECRET;
  const ip = clientIpOf(req, env);
  if (secret && ip) {
    headers[CLIENT_IP_HEADER] = ip;
    headers[PROXY_SECRET_HEADER] = secret;
  }
  return headers;
}

// Recopie tous les cookies renvoyés par le backend (et pas seulement le dernier)
export function forwardSetCookies(
  res: Pick<ServerResponse, 'appendHeader'>,
  response: Pick<Response, 'headers'>,
  rewrite: (cookie: string) => string = (cookie) => cookie
): void {
  const cookies = response.headers.getSetCookie?.() ?? [];
  for (const cookie of cookies) res.appendHeader('Set-Cookie', rewrite(cookie));
}
