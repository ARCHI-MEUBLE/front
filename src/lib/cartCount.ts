// Le panier est réparti en quatre listes côté backend : meubles configurés (anciens paniers), échantillons,
// produits du catalogue et façades. Le compteur les additionne comme la page panier.
export type CartLists = {
  configurations?: { item_count?: number } | null;
  samples?: { count?: number } | null;
  catalogue?: { items?: { quantity?: number }[] } | null;
  facades?: { count?: number } | null;
};

const CART_URLS = {
  // configurations: '/backend/api/cart/index.php',
  samples: '/api/cart/samples',
  catalogue: '/api/cart/catalogue',
  facades: '/backend/api/cart/facades.php',
};

const CART_CHANGED = 'archimeuble:cart-changed';

export function countCartItems({ configurations, samples, catalogue, facades }: CartLists): number {
  const catalogueQuantity = (catalogue?.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  return (configurations?.item_count ?? 0) + (samples?.count ?? 0) + catalogueQuantity + (facades?.count ?? 0);
}

// Une liste qui ne répond pas compte pour zéro : le compteur ne doit jamais bloquer le header
async function readCartList(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { credentials: 'include' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// Réponses rangées par nom de liste, pas par position : une liste désactivée dans CART_URLS ne décale pas les autres
export async function fetchCartCount(): Promise<number> {
  const lists = await Promise.all(
    Object.entries(CART_URLS).map(async ([name, url]) => [name, await readCartList(url)] as const)
  );
  return countCartItems(Object.fromEntries(lists) as CartLists);
}

// Prévient les compteurs affichés qu'un article a été ajouté ou retiré, avec le nouveau total s'il est déjà connu
export function notifyCartChanged(count?: number): void {
  window.dispatchEvent(new CustomEvent<number | undefined>(CART_CHANGED, { detail: count }));
}

export function onCartChanged(listener: (count: number | undefined) => void): () => void {
  const handle = (event: Event) => listener((event as CustomEvent<number | null>).detail ?? undefined);
  window.addEventListener(CART_CHANGED, handle);
  return () => window.removeEventListener(CART_CHANGED, handle);
}
