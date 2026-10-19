import Image from "next/image";
import Link from "next/link";
import { HOME_PILL_DARK, HOME_PILL_OUTLINE, HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { AvisReviewData } from "@/components/avis/AvisReviewCard";
import { RatingStars } from "@/components/shared/RatingStars";
import { formatRating } from "@/lib/rating";

export function AvisHero({
  avgRating,
  totalCount,
  distribution,
  featured,
}: {
  avgRating: number;
  totalCount: number;
  distribution: { star: number; percent: number }[];
  featured: AvisReviewData | null;
}) {
  return (
    <section
      aria-labelledby="avis-page-title"
      className={HOME_SECTION_NO_TOP}
      style={{ paddingTop: "clamp(40px,7vw,96px)" }}
    >
      <div className="grid grid-cols-1 items-center gap-[clamp(48px,6vw,96px)] lg:grid-cols-2">
        <div className="flex flex-col items-start gap-7">
          <span className="rounded-lg bg-am-navy px-3 py-[7px] text-[14px] font-medium text-white">
            Avis clients
          </span>
          <h1 id="avis-page-title" className="m-0 text-display text-black">
            Ils nous font <span className="am-highlight">confiance.</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3.5">
            <span className="text-[48px] font-semibold leading-none tracking-[-0.04em] text-black">
              {formatRating(avgRating)}
            </span>
            <RatingStars rating={avgRating} size={32} />
          </div>
          <p className="m-0 max-w-[42ch] text-lead text-black/85">
            Avis clients de la métropole lilloise
          </p>
          <div className="flex flex-wrap gap-2.5">
            <a href="#leave-title" className={HOME_PILL_DARK}>
              Laisser un avis →
            </a>
            <Link href="/realisations" className={HOME_PILL_OUTLINE}>
              Voir nos réalisations →
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[600px]" style={{ aspectRatio: "1/1.02", containerType: "inline-size" }}>
          <div
            className="absolute left-0 overflow-hidden rounded-[22px] bg-am-mist/25"
            style={{ top: "6%", width: "68%", height: "84%" }}
          >
            <Image
              src="https://images.unsplash.com/photo-1544164560-adac3045edb2?auto=format&fit=crop&w=1100&q=75"
              alt=""
              fill
              unoptimized
              loading="eager"
              className="object-cover"
            />
          </div>

          <div
            className="absolute flex items-center gap-2 rounded-md bg-am-mist shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_16px_40px_-12px_rgba(0,0,0,0.22)]"
            style={{ left: "-3%", top: "12%", padding: "2.4cqi 3.4cqi" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth={1.8} strokeLinejoin="round" style={{ width: "4.4cqi", height: "4.4cqi" }}>
              <path d="M4 5h16v11H9l-5 4z" />
            </svg>
            <span className="whitespace-nowrap font-semibold tracking-[-0.03em]" style={{ fontSize: "clamp(14px,4cqi,24px)" }}>
              Nouvel avis
            </span>
          </div>

          <div
            className="absolute right-0 top-0 flex flex-col gap-[2.4cqi] rounded-md bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_16px_40px_-12px_rgba(0,0,0,0.22)]"
            style={{ width: "38%", padding: "3.4cqi 3.6cqi" }}
          >
            <div className="flex items-start justify-between gap-[2cqi]">
              <span className="font-semibold leading-[0.9] tracking-[-0.05em]" style={{ fontSize: "clamp(28px,9cqi,52px)" }}>
                {formatRating(avgRating)}
              </span>
              <span className="flex flex-col items-end gap-[1cqi] pt-[0.6cqi]">
                <RatingStars rating={avgRating} size={12} />
                <span className="font-mono uppercase tracking-[0.04em] text-black/70" style={{ fontSize: "clamp(9px,1.8cqi,11px)" }}>
                  sur 5
                </span>
              </span>
            </div>
            <div className="h-px bg-am-mist/25" />
            <div className="flex flex-col gap-[1.5cqi]">
              {distribution.map(({ star, percent }) => (
                <div
                  key={star}
                  className="grid items-center gap-[1.6cqi]"
                  style={{ gridTemplateColumns: "auto minmax(0,1fr) 3.2em", fontSize: "clamp(10px,2.1cqi,12px)" }}
                >
                  <span className="whitespace-nowrap text-black">
                    {star} <span className="text-am-wine">★</span>
                  </span>
                  <span className="h-1 bg-am-mist/25">
                    <span className="block h-full bg-am-wine" style={{ width: `${percent}%` }} />
                  </span>
                  <span className="text-right font-mono text-black/70">{percent}%</span>
                </div>
              ))}
            </div>
          </div>

          {featured && (
            <div
              className="absolute right-0 flex flex-col gap-[2cqi] rounded-md bg-white p-[3.4cqi] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_16px_40px_-12px_rgba(0,0,0,0.22)]"
              style={{ top: "52%", width: "42%" }}
            >
              <RatingStars rating={featured.rating} size={16} />
              <p className="m-0 leading-[1.4] text-black" style={{ fontSize: "clamp(12px,2.7cqi,16px)" }}>
                « {featured.text} »
              </p>
              <div className="flex items-center gap-[1.8cqi]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featured.avatarUrl}
                  alt=""
                  className="block flex-none rounded-full object-cover"
                  style={{ width: "clamp(30px,7cqi,40px)", height: "clamp(30px,7cqi,40px)" }}
                />
                <span className="leading-[1.25]" style={{ fontSize: "clamp(11px,2.4cqi,14px)" }}>
                  <strong className="font-semibold">{featured.authorName}</strong>
                  {featured.city && <br />}
                  {featured.city && <span className="text-black/70">{featured.city}</span>}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
