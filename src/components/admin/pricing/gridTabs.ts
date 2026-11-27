// Rubriques de la page « Prix & livraison » : chaque catégorie de la grille (pricing_config.category) est rangée dans
// un onglet lisible par un commerçant, avec une explication du calcul en clair.
import type { PricingParam } from '@/lib/pricingAdminApi';
import { paramKey } from './gridUnits';

export type GridTabKey =
  | 'workshop'
  | 'materials'
  | 'fronts'
  | 'options'
  | 'bases'
  | 'shipping'
  | 'payment'
  | 'range'
  | 'handles'
  | 'other';

export interface GridTab {
  key: GridTabKey;
  label: string;
  categories: string[];
  intro: string;
}

export const GRID_TABS: GridTab[] = [
  {
    key: 'workshop',
    label: 'Atelier & panneaux',
    categories: ['workshop', 'panels'],
    intro:
      'Chaque meuble paie le forfait atelier (conception, découpe, assemblage, finitions). Les panneaux (côtés, dessus, dessous, fond, étagères, montants) sont comptés à la surface, au prix au m² de leur matière (onglet Matières). Le fond, plus fin, ne compte que pour une part de ce prix.',
  },
  {
    key: 'materials',
    label: 'Matières',
    categories: ['materials'],
    intro:
      'Chaque partie du meuble est comptée au prix au m² de SA matière : structure, fond, étagères et montants, portes, tiroirs, façade d’une case. Une matière sans prix propre est comptée au prix par défaut.',
  },
  {
    key: 'fronts',
    label: 'Portes & tiroirs',
    categories: ['fronts'],
    intro:
      'Chaque porte ou tiroir coûte un forfait (charnières ou coulisses, pose) plus sa façade : surface × prix au m² de sa matière × majoration façade (chants, finition). Une double porte compte deux forfaits. Le mécanisme push remplace la poignée. Une porte vitrée ajoute son supplément au m². Une porte coulissante compte un forfait et une cuvette par vantail (2 jusqu’à 1,60 m d’ouverture, 3 au-delà), plus le rail et sa défonce au mètre, en haut et en bas.',
  },
  {
    key: 'options',
    label: 'Options',
    categories: ['options'],
    intro:
      'Tringle de penderie et éclairage LED au mètre de largeur de la case, passe-câble à l’unité. Le montage encastré ajoute son supplément une fois par meuble.',
  },
  {
    key: 'bases',
    label: 'Socles',
    categories: ['bases'],
    intro:
      'Pieds métal : une paire de pieds par écart maximal de largeur, avec un nombre minimal de paires. Socle bois : au mètre de largeur du meuble.',
  },
  {
    key: 'shipping',
    label: 'Livraison & pose',
    categories: ['shipping', 'installation'],
    intro:
      'La livraison ne fait plus partie du prix du meuble : elle s’ajoute à part au panier et à la commande. Meuble sur mesure : largeur × hauteur du meuble (en m²) × prix au m², avec un minimum par meuble. Façades, articles du catalogue et échantillons : un forfait colis par commande, offert à partir du seuil de gratuité. La pose et le montage chez le client sont une option du configurateur (étape Finitions) : même calcul que la livraison d’un meuble, ajouté au prix du meuble quand le client la choisit.',
  },
  {
    key: 'payment',
    label: 'Paiement',
    categories: ['payment'],
    intro:
      'Pourcentage proposé quand vous passez une commande en « acompte + solde » (section Commandes). Vous pouvez toujours le changer commande par commande. Les échantillons et articles du catalogue sont payés en totalité avec l’acompte.',
  },
  {
    key: 'range',
    label: 'Fourchette & arrondi',
    categories: ['uncertainty', 'rounding'],
    intro:
      'Le configurateur affiche une fourchette : prix ± écart type. Chaque poste a une incertitude, en % de son montant ; l’écart type combine ces incertitudes (racine de la somme des carrés). Le prix et la fourchette sont ensuite arrondis au pas indiqué.',
  },
  {
    key: 'handles',
    label: 'Poignées (anciennes)',
    categories: ['handles'],
    intro:
      'Ces prix ne servent plus qu’aux configurations enregistrées avant l’arrivée des modèles de poignées (barre verticale, barre horizontale, bouton, poignée encastrée). Le prix des poignées proposées aujourd’hui se règle dans la section Poignées.',
  },
];

// Onglet de secours : une catégorie inconnue reste visible et modifiable
export const OTHER_TAB: GridTab = {
  key: 'other',
  label: 'Autres',
  categories: [],
  intro: 'Paramètres de la grille qui ne relèvent d’aucune rubrique ci-dessus.',
};

// Aide courte sous certains paramètres (exemple chiffré, sens du 0)
export const PARAM_HELP: Record<string, string> = {
  'materials.default.price_per_m2': 'Appliqué à toute matière qui n’a pas son propre prix au m².',
  'panels.back.surface_factor': 'Exemple : × 0,5 compte le fond à la moitié du prix au m² de sa matière.',
  'fronts.facade.material_factor': 'Exemple : × 1,3 compte une façade 30 % plus cher que le même panneau brut.',
  'fronts.glass.supplement_per_m2': 'Ajouté à la façade d’une porte vitrée, par m² de porte.',
  'fronts.sliding.rail_price_per_m': 'Compté deux fois la largeur de l’ouverture (rail du haut et rail du bas). Exemple : 1,80 m d’ouverture = 3,60 m de rail.',
  'fronts.sliding.groove_price_per_m': 'Usinage de la défonce qui reçoit le rail, deux fois la largeur de l’ouverture.',
  'options.flush_mounting.supplement': 'Ajouté une fois par meuble monté en encastré (0 = sans supplément).',
  'bases.metal.foot_spacing_mm': 'Exemple : 1 000 mm pose une paire de pieds de plus par mètre de largeur.',
  'bases.metal.min_pairs': 'Nombre de paires de pieds facturées au minimum, même pour un petit meuble.',
  'shipping.furniture.price_per_m2': 'Exemple : un meuble de 1,70 m × 0,60 m fait 1,02 m² de façade.',
  'shipping.furniture.minimum': 'Montant minimal de livraison par meuble (0 = pas de minimum).',
  'shipping.parcel.flat': 'Par commande contenant façades, articles du catalogue ou échantillons (0 = offert).',
  'shipping.parcel.free_from': 'Sous-total colis à partir duquel le forfait est offert (0 = jamais offert).',
  'installation.furniture.price_per_m2': 'Exemple : une armoire de 2,60 m × 2,20 m fait 5,72 m² de façade.',
  'installation.furniture.minimum': 'Montant minimal de la pose et du montage par meuble (0 = pas de minimum).',
  'payment.deposit.default_percent': 'Entre 1 et 99 %.',
  'rounding.price.step': 'Exemple : un pas de 10 € arrondit 1 234 € à 1 230 €.',
};

export function tabForCategory(category: string): GridTabKey {
  return GRID_TABS.find((tab) => tab.categories.includes(category))?.key ?? 'other';
}

// Ordre d'affichage dans un onglet : ordre des catégories de l'onglet, puis id (ordre de création en base),
// le prix par défaut des matières en premier
export function sortParams(params: PricingParam[], tab: GridTab): PricingParam[] {
  const rank = (p: PricingParam) => (tab.categories.indexOf(p.category) + 1 || 99) * 1_000_000 + p.id;
  return [...params].sort((a, b) => {
    if (paramKey(a) === 'materials.default.price_per_m2') return -1;
    if (paramKey(b) === 'materials.default.price_per_m2') return 1;
    return rank(a) - rank(b);
  });
}

// Libellé d'un paramètre sans description en base : la clé technique, lisible
export function fallbackLabel(param: PricingParam): string {
  return `${param.category} · ${param.item_type} · ${param.param_name}`.replace(/_/g, ' ');
}
