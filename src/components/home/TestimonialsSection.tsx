import Link from "next/link";
import { HOME_MONO, HOME_PILL_DARK, HOME_SECTION } from "@/components/home/homeLayout";
import { TESTIMONIALS, avatarUrl } from "@/components/home/homeData";

const TINTS = [
  { bg: "var(--am-mist)", ink: "#000000" },
  { bg: "var(--am-navy)", ink: "#FFFFFF" },
  { bg: "var(--am-red)", ink: "#FFFFFF" },
  { bg: "var(--am-wine)", ink: "#FFFFFF" },
];

export function TestimonialsSection() {
  const columnA = TESTIMONIALS.slice(0, 4);
  const columnB = TESTIMONIALS.slice(4, 8);

  return (
    <section aria-labelledby="avis-title" className={HOME_SECTION}>
      <div className="grid grid-cols-1 items-center gap-[clamp(40px,5vw,72px)] lg:grid-cols-2">
        <div className="flex flex-col items-start gap-5">
          <h2
            id="avis-title"
            className="m-0 max-w-[11ch] font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-black"
            style={{ fontSize: "clamp(36px,5vw,72px)" }}
          >
            Ils nous font confiance.
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[32px] font-semibold leading-none tracking-[-0.04em] text-black">4,3</span>
            <span role="img" aria-label="Note de 4,3 sur 5" className="flex gap-[3px]">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="flex h-8 w-8 items-center justify-center bg-am-red text-[22px] leading-none text-white">★</span>
              ))}
              <span
                className="flex h-8 w-8 items-center justify-center text-[22px] leading-none text-white"
                style={{ background: "linear-gradient(90deg,var(--am-red) 30%,rgba(0,0,0,0.15) 30%)" }}
              >
                ★
              </span>
            </span>
            <span className={`text-[13px] ${HOME_MONO}`}>Avis clients de la métropole lilloise</span>
          </div>
          <Link href="/avis" className={`mt-2 ${HOME_PILL_DARK}`}>Voir tous les avis →</Link>
        </div>

        <div
          className="grid grid-cols-1 gap-4 overflow-hidden sm:grid-cols-2"
          style={{
            height: "clamp(520px,60vw,680px)",
            maskImage: "linear-gradient(180deg,transparent,#000 14%,#000 86%,transparent)",
            WebkitMaskImage: "linear-gradient(180deg,transparent,#000 14%,#000 86%,transparent)",
          }}
        >
          <div className="min-w-0 overflow-hidden">
            <div className="home-marquee-up flex flex-col gap-4 pb-4">
              {[...columnA, ...columnA].map((testimonial, index) => (
                <TestimonialCard key={index} testimonial={testimonial} tint={TINTS[index % 4]} />
              ))}
            </div>
          </div>
          <div className="min-w-0 overflow-hidden">
            <div className="home-marquee-down flex flex-col gap-4 pb-4">
              {[...columnB, ...columnB].map((testimonial, index) => (
                <TestimonialCard key={index} testimonial={testimonial} tint={TINTS[index % 4]} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({
  testimonial,
  tint,
}: {
  testimonial: (typeof TESTIMONIALS)[number];
  tint: { bg: string; ink: string };
}) {
  return (
    <figure className="m-0 flex flex-col gap-5 rounded-2xl border border-black/15 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <span role="img" aria-label={`${testimonial.rating} étoiles sur 5`} className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="flex h-6 w-6 items-center justify-center text-[16px] leading-none"
            style={{ background: i < testimonial.rating ? tint.bg : "#E5E2D9", color: i < testimonial.rating ? tint.ink : "#FFFFFF" }}
          >
            ★
          </span>
        ))}
      </span>
      <blockquote className="m-0 text-[16px] leading-[1.55] text-black/70">{testimonial.quote}</blockquote>
      <figcaption className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl(testimonial.name, testimonial.avatarParams)}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          className="block h-12 w-12 flex-none rounded-full border border-black/15 bg-am-mist/25"
        />
        <span>
          <span className="block text-[16px] font-medium text-black">{testimonial.name}</span>
          <span className="block font-[Geist_Mono] text-[12px] text-black/70">{testimonial.city}</span>
        </span>
      </figcaption>
    </figure>
  );
}
