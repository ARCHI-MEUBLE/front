// Texte d'une case du plan 2D : ce qui tient dans sa taille réelle à l'écran.
// Une case de meuble très divisé peut ne mesurer que quelques pixels : on affiche alors seulement l'essentiel
// (le contenu d'abord, les dimensions seulement s'il reste de la place) au lieu de laisser le texte déborder.

export interface TextRow {
  text: string;
  size: number;
}

export interface LeafLayout {
  // Taille de l'icône du contenu en pixels (0 : pas d'icône)
  icon: number;
  label: TextRow | null;
  dims: TextRow | null;
}

interface LeafLayoutInput {
  pxWidth: number;
  pxHeight: number;
  // Libellé court du contenu (« Tiroir », « Vide »…)
  label: string;
  widthMm: number;
  heightMm: number;
  // Le contenu a une icône (tiroir, porte…) : elle passe avant le texte
  hasIcon: boolean;
}

// Bordure et respiration autour du contenu
const PADDING = 6;
// Largeur moyenne d'un caractère, en fraction de la taille de police
const MONO_CHAR = 0.6;
const SANS_CHAR = 0.58;
const LINE = 1.25;

export function layoutLeafText({ pxWidth, pxHeight, label, widthMm, heightMm, hasIcon }: LeafLayoutInput): LeafLayout {
  const layout: LeafLayout = { icon: 0, label: null, dims: null };
  let remaining = pxHeight - PADDING;

  const fullDims = `${widthMm} × ${heightMm} mm`;
  const shortDims = `${widthMm}×${heightMm}`;
  const labelOptions: TextRow[] = [18, 14, 12].map((size) => ({ text: label, size }));
  const dimsOptions: TextRow[] = [
    { text: fullDims, size: 16 },
    { text: fullDims, size: 12 },
    { text: shortDims, size: 11 },
    { text: shortDims, size: 9 },
  ];

  const pick = (options: TextRow[], charWidth: number): TextRow | null =>
    options.find(
      (option) =>
        option.text.length * option.size * charWidth + PADDING <= pxWidth && remaining >= option.size * LINE
    ) ?? null;

  const addIcon = () => {
    if (!hasIcon) return;
    const size = pxHeight >= 90 && pxWidth >= 60 ? 20 : pxWidth < 26 || pxHeight < 26 ? 12 : 16;
    if (pxWidth >= size + PADDING && remaining >= size) {
      layout.icon = size;
      remaining -= size + 2;
    }
  };
  const addLabel = () => {
    const row = pick(labelOptions, SANS_CHAR);
    if (row) {
      layout.label = row;
      remaining -= row.size * LINE + 2;
    }
  };
  const addDims = () => {
    const row = pick(dimsOptions, MONO_CHAR);
    if (row) {
      layout.dims = row;
      remaining -= row.size * LINE + 2;
    }
  };

  // Priorité : un contenu (tiroir, porte…) se reconnaît à son icône puis à son nom ; une case vide
  // est surtout utile pour ses dimensions
  if (hasIcon) {
    addIcon();
    addLabel();
    addDims();
  } else {
    addDims();
    addLabel();
  }

  return layout;
}
