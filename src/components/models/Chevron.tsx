// Chevron en trait fin des carrousels de la page modèles ; la couleur vient de `currentColor` (bordeaux pour les
// catégories, bleu nuit pour les modèles)
const POINTS = {
  up: "2,11.5 12,2 22,11.5",
  down: "2,1.5 12,11 22,1.5",
  left: "11.5,2 2,12 11.5,22",
  right: "1.5,2 11,12 1.5,22",
} as const;

export function Chevron({ direction, className }: { direction: keyof typeof POINTS; className?: string }) {
  const vertical = direction === "up" || direction === "down";
  return (
    <svg
      viewBox={vertical ? "0 0 24 13" : "0 0 13 24"}
      aria-hidden="true"
      className={className ?? (vertical ? "h-[17px] w-8" : "h-8 w-[17px]")}
    >
      <polyline
        points={POINTS[direction]}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
