// w-full : dans une colonne flex (accueil, pied de page), mx-auto seul fait rétrécir la section à la largeur de son contenu
export const HOME_SECTION = "mx-auto w-full max-w-[1360px] px-[clamp(20px,4vw,48px)] pt-[clamp(80px,10vw,144px)]";
export const HOME_SECTION_NO_TOP = "mx-auto w-full max-w-[1360px] px-[clamp(20px,4vw,48px)]";
// Étiquettes en capitales Geist Mono : 12 px, ou 11 px dans les pastilles et les légendes (utilities « eyebrow » de styles/globals.css).
// Ne pas y ajouter de text-xs / text-[…] : la taille vient de l'utility.
export const HOME_MONO = "eyebrow-lg text-black/70";
export const HOME_MONO_SM = "eyebrow text-black/70";
export const HOME_BODY = "text-black/85";

// Boutons : bordeaux pour passer à l'action (configurer, ajouter au panier), bleu foncé pour l'action principale du reste du site,
// contour pour l'action secondaire. Le bleu clair est réservé aux fonds foncés (bordeaux, photo sombre), où il se détache.
export const HOME_PILL_WINE =
  "inline-flex items-center justify-center rounded-full border border-black bg-am-wine px-6 py-3.5 text-[15px] font-medium text-white transition-transform duration-200 hover:-translate-y-0.5";
export const HOME_PILL_DARK =
  "inline-flex items-center justify-center rounded-full border border-black bg-am-navy px-6 py-3.5 text-[15px] font-medium text-white transition-transform duration-200 hover:-translate-y-0.5";
export const HOME_PILL_OUTLINE =
  "inline-flex items-center justify-center rounded-full border border-black/30 px-6 py-3.5 text-[15px] text-black transition-colors duration-200 hover:bg-white/40";
