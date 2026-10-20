export interface SwatchData {
  name: string;
  file: string;
  hex: string;
}

export const SWATCHES: SwatchData[] = [
  { name: "Bleu minéral", file: "armoire_bleu.png", hex: "#5E7D96" },
  { name: "Ambre solaire", file: "armoire_jaune.png", hex: "#D9A441" },
  { name: "Blanc opalin", file: "armoire_blanc_clair.png", hex: "#F1EEE6" },
  { name: "Bleu nuit velours", file: "armoire_bleu_nuit.png", hex: "#22304A" },
  { name: "Blush pêche", file: "armoire_peche.png", hex: "#E8B9A2" },
  { name: "Chêne naturel", file: "armoire.jpg", hex: "#C49A6C" },
  { name: "Gris galet", file: "armoire_grise.png", hex: "#9A9790" },
  { name: "Kaki organique", file: "armoire_kaki.png", hex: "#7C7A4E" },
  { name: "Noir profond", file: "armoire_noire.png", hex: "#1C1C1C" },
  { name: "Noisette caramélisée", file: "armoire_brun2.png", hex: "#9C6B45" },
  { name: "Noyer fumé", file: "armoire_brun_foncé.png", hex: "#5A3E2E" },
  { name: "Pourpre impérial", file: "armoire_pourpre.png", hex: "#6E2B4F" },
  { name: "Prune velours", file: "armoire_violet_foncé.png", hex: "#4A2A45" },
  { name: "Rouge grenat", file: "armoire_rouge.png", hex: "#8E2B2B" },
  { name: "Saule poudré", file: "armoire_vert2.png", hex: "#A9B69A" },
  { name: "Terracotta solaire", file: "armoire_orange.png", hex: "#C1673F" },
  { name: "Turquoise lagon", file: "armoire_turquoise.png", hex: "#3F8F8C" },
  { name: "Vert forêt profonde", file: "armoire_vert_foncé.png", hex: "#2E4535" },
  { name: "Vert sauge", file: "armoire_verte.png", hex: "#8FA38A" },
  { name: "Violet brumeux", file: "armoire_violet.png", hex: "#8C7A9E" },
];

export function swatchImage(file: string): string {
  return "/images/photos_meuble_couleur/" + file;
}
