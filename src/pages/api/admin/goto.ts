import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminSession } from '@/lib/adminAuth';
import { ADMIN_SUBPATH } from '@/lib/adminPath';
import { serverAdminUrl } from '@/lib/adminPathServer';

// Retour vers l'admin depuis une page publique (configurateur ouvert depuis l'admin), sans que le chemin secret de
// l'admin soit écrit dans le code de cette page. Seul un admin connecté est redirigé : pour les autres, cette adresse
// n'existe pas (404), elle ne révèle rien.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end();
    return;
  }
  res.setHeader('Cache-Control', 'no-store');

  if (!(await verifyAdminSession(req, res))) {
    res.status(404).end();
    return;
  }

  // Une page de l'admin seulement : pas de redirection vers un autre site (« //exemple.com », « https://… »)
  const requested = typeof req.query.to === 'string' ? req.query.to : '';
  const to = ADMIN_SUBPATH.test(requested) ? requested : '/dashboard';
  res.redirect(302, serverAdminUrl(to));
}
