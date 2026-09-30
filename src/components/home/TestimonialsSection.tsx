import Link from "next/link";
import { HOME_MONO, HOME_PILL_DARK, HOME_SECTION } from "@/components/home/homeLayout";
import { TESTIMONIALS, avatarUrl } from "@/components/home/homeData";

const TINTS = [
  { bg: "#D4FF3A", ink: "#161513" },
  { bg: "#EDEBE4", ink: "#161513" },
  { bg: "#161513", ink: "#F7F6F2" },
  { bg: "#E8B9A2", ink: "#161513" },
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
            className="m-0 max-w-[11ch] font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-[#161513]"
            style={{ fontSize: "clamp(36px,5vw,72px)" }}
          >
            Ils nous font confiance.
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[32px] font-semibold leading-none tracking-[-0.04em] text-[#161513]">4,3</span>
            <span role="img" aria-label="Note de 4,3 sur 5" className="flex gap-[3px]">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="flex h-8 w-8 items-center justify-center bg-[#00B67A] text-[22px] leading-none text-white">★</span>
              ))}
              <span
                className="flex h-8 w-8 items-center justify-center text-[22px] leading-none text-white"
                style={{ background: "linear-gradient(90deg,#00B67A 30%,#DCDCE6 30%)" }}
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
    <figure className="m-0 flex flex-col gap-5 rounded-2xl border border-[#E5E2D9] bg-white p-6 shadow-[0_1px_2px_rgba(22,21,19,0.04)]">
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
      <blockquote className="m-0 text-[16px] leading-[1.55] text-[#5F5B53]">{testimonial.quote}</blockquote>
      <figcaption className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl(testimonial.name, testimonial.avatarParams)}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          className="block h-12 w-12 flex-none rounded-full border border-[#E5E2D9] bg-[#EDEBE4]"
        />
        <span>
          <span className="block text-[16px] font-medium text-[#161513]">{testimonial.name}</span>
          <span className="block font-[Geist_Mono] text-[12px] text-[#5F5B53]">{testimonial.city}</span>
        </span>
      </figcaption>
    </figure>
  );
}
