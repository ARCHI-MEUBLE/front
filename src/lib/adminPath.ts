/**
 * Retourne le chemin secret de l'admin depuis la variable d'environnement.
 * Fallback sur '/admin' si NEXT_PUBLIC_ADMIN_PATH n'est pas defini.
 */
export function getAdminBasePath(): string {
  const secretPath = process.env.NEXT_PUBLIC_ADMIN_PATH;
  if (secretPath) return `/${secretPath}`;
  return '/admin';
}

/**
 * Construit une URL admin complete.
 * @param subPath - ex: '/login', '/dashboard'
 * @returns ex: '/Xk7-mP9_qW2rL5/login'
 */
export function adminUrl(subPath: string = ''): string {
  const base = getAdminBasePath();
  if (!subPath || subPath === '/') return base;
  const normalized = subPath.startsWith('/') ? subPath : `/${subPath}`;
  return `${base}${normalized}`;
}
