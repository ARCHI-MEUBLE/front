// Teinte d'une niche tant qu'on ne lui en donne pas une autre : celle du fond du meuble, un peu plus
// sombre pour que le creux se détache. Une couleur illisible est rendue telle quelle.
const NICHE_DARKENING = 0.78;

export function nicheDefaultColor(backHex: string | null | undefined): string {
  const match = /^#([0-9a-f]{6})$/i.exec((backHex ?? '').trim());
  if (!match) return backHex || '#8C8577';
  const value = parseInt(match[1], 16);
  const channel = (shift: number) =>
    Math.round(((value >> shift) & 0xff) * NICHE_DARKENING)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}
