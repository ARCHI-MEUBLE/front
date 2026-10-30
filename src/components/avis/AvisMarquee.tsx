import { HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { AvisReviewCard, AvisReviewData } from "@/components/avis/AvisReviewCard";

const DIRECTIONS = ["up", "down", "up"] as const;

export function AvisMarquee({ reviews }: { reviews: AvisReviewData[] }) {
  if (reviews.length === 0) return null;

  const columns: AvisReviewData[][] = [[], [], []];
  reviews.forEach((review, index) => columns[index % 3].push(review));

  return (
    <section aria-label="Tous les avis" className={HOME_SECTION_NO_TOP} style={{ paddingTop: "clamp(56px,7vw,96px)" }}>
      <div
        className="grid grid-cols-3 gap-6 overflow-hidden"
        style={{
          height: "clamp(560px,64vw,760px)",
          maskImage: "linear-gradient(transparent,#000 10%,#000 90%,transparent)",
          WebkitMaskImage: "linear-gradient(transparent,#000 10%,#000 90%,transparent)",
        }}
      >
        {columns.map((column, colIndex) =>
          column.length === 0 ? null : (
            <div key={colIndex} className="min-w-0 overflow-hidden">
              <div
                className={DIRECTIONS[colIndex] === "up" ? "home-marquee-up" : "home-marquee-down"}
                style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 24 }}
              >
                {[...column, ...column].map((review, i) => (
                  <AvisReviewCard key={`${review.id}-${i}`} review={review} />
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
