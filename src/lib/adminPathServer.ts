// Chemin secret de l'admin, côté serveur seulement : proxy.ts, getServerSideProps, routes API.
// Ne pas importer ce fichier depuis du code exécuté dans le navigateur : NEXT_PUBLIC_ADMIN_PATH (ancien nom, gardé pour
// les déploiements pas encore renommés) y serait recopié. Le navigateur passe par adminPath.ts.

const clean = (value: string | undefined) => (value ?? '').trim().replace(/^\/+|\/+$/g, '');

// Premier segment de l'adresse de l'admin, sans barre oblique, ou null s'il n'est pas configuré
export function serverAdminSegment(env: Record<string, string | undefined> = process.env): string | null {
  return clean(env.ADMIN_PATH) || clean(env.NEXT_PUBLIC_ADMIN_PATH) || null;
}

// '/login' → '/<chemin secret>/login' (repli sur /admin, bloqué par proxy.ts, si rien n'est configuré)
export function serverAdminUrl(subPath = '', env: Record<string, string | undefined> = process.env): string {
  const segment = serverAdminSegment(env);
  const base = segment ? `/${segment}` : '/admin';
  if (!subPath || subPath === '/') return base;
  return `${base}${subPath.startsWith('/') ? subPath : `/${subPath}`}`;
}
