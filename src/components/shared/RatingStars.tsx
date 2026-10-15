import { formatRating } from "@/lib/rating";

// Cinq cases rouges, la dernière remplie en proportion (4,5 → quatre cases pleines et une demie)
export function RatingStars({ rating, size }: { rating: number; size: number }) {
  return (
    <span role="img" aria-label={`Note de ${formatRating(rating)} sur 5`} className="flex gap-0.5">
      {[0, 1, 2, 3, 4].map((index) => {
        const filled = Math.min(1, Math.max(0, rating - index)) * 100;
        return (
          <span
            key={index}
            aria-hidden="true"
            className="flex items-center justify-center text-white"
            style={{
              width: size,
              height: size,
              fontSize: size * 0.65,
              background: `linear-gradient(90deg, var(--am-wine) ${filled}%, rgba(0,0,0,0.15) ${filled}%)`,
            }}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}
