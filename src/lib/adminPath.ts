// Adresses de l'admin, pour le code qui s'exécute dans le navigateur.
//
// Le chemin secret de l'admin n'est plus écrit dans le JavaScript envoyé aux navigateurs : la variable
// NEXT_PUBLIC_ADMIN_PATH l'y recopiait, jusque dans le configurateur public, où n'importe qui pouvait le lire.
// - Sur une page admin, le navigateur affiche déjà ce chemin : on le lit dans l'adresse de la page.
// - Pendant le rendu serveur, il vient de ADMIN_PATH (variable sans préfixe NEXT_PUBLIC_, jamais recopiée).
// - Depuis une page publique (configurateur ouvert depuis l'admin), goToAdmin passe par le serveur, qui ne redirige
//   qu'un admin connecté.

const clean = (value: string | undefined) => (value ?? '').trim().replace(/^\/+|\/+$/g, '');

// Chemin de base de l'admin, à appeler depuis une page admin
export function getAdminBasePath(): string {
  const segment =
    typeof window !== 'undefined' ? clean(window.location.pathname.split('/')[1]) : clean(process.env.ADMIN_PATH);
  return segment ? `/${segment}` : '/admin';
}

/**
 * Construit une URL admin complète, depuis une page admin.
 * @param subPath - ex: '/login', '/dashboard'
 * @returns ex: '/Xk7-mP9_qW2rL5/login'
 */
export function adminUrl(subPath: string = ''): string {
  const base = getAdminBasePath();
  if (!subPath || subPath === '/') return base;
  const normalized = subPath.startsWith('/') ? subPath : `/${subPath}`;
  return `${base}${normalized}`;
}

// Chemins de l'admin acceptés par /api/admin/goto : une page de l'admin, éventuellement avec des paramètres simples
export const ADMIN_SUBPATH = /^\/[A-Za-z0-9/_-]*(\?[A-Za-z0-9=&_-]*)?$/;

// Depuis une page publique : le serveur vérifie la session puis redirige vers l'admin
export function goToAdmin(subPath: string = '/dashboard'): void {
  window.location.href = `/api/admin/goto?to=${encodeURIComponent(subPath)}`;
}
