import Link from "next/link";
import { HOME_SECTION, HOME_HEADING, HOME_MONO } from "@/components/home/homeLayout";

const testimonials = [
  {
    quote:
      "Un travail remarquable du début à la fin. Notre bibliothèque s'intègre parfaitement dans le salon, comme si elle avait toujours été là.",
    name: "Marie-Claire D.",
    city: "Lille"
  },
  {
    quote: "Le configurateur en ligne est vraiment bien fait. J'ai pu visualiser mon dressing avant de commander.",
    name: "Thomas L.",
    city: "Roubaix"
  },
  {
    quote: "Livraison dans les temps et pose impeccable. Les menuisiers sont arrivés à l'heure et ont tout nettoyé en partant.",
    name: "Sophie M.",
    city: "Marcq-en-Barœul"
  },
  {
    quote: "Rapport qualité-prix excellent. On a comparé avec d'autres artisans et ArchiMeuble était le plus compétitif.",
    name: "Jean-Pierre B.",
    city: "Tourcoing"
  }
];

const columns = [
  { items: [testimonials[0], testimonials[2], testimonials[0], testimonials[2]], direction: "up" },
  { items: [testimonials[1], testimonials[3], testimonials[1], testimonials[3]], direction: "down" }
];

function ReviewCard({ quote, name, city }: { quote: string; name: string; city: string }) {
  return (
    <figure className="m-0 flex flex-col gap-5 rounded-2xl border border-[#E5E2D9] bg-white p-6 shadow-[0_1px_2px_rgba(22,21,19,0.04)]">
      <span className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className="flex h-6 w-6 items-center justify-center bg-[#00B67A] text-[16px] leading-none text-white">
            ★
          </span>
        ))}
      </span>
      <blockquote className="m-0 text-[16px] leading-[1.55] text-[#5F5B53]">{quote}</blockquote>
      <figcaption className="flex items-center gap-3">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-[#E5E2D9] bg-[#EDEBE4] text-[15px] font-medium text-[#5F5B53]">
          {name.charAt(0)}
        </span>
        <span>
          <span className="block text-[16px] font-medium text-[#161513]">{name}</span>
          <span className={`block text-[12px] text-[#5F5B53] ${HOME_MONO}`}>{city}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export function TestimonialsSection() {
  return (
    <section aria-labelledby="avis-title" className={HOME_SECTION}>
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-5">
          <h2 id="avis-title" className={`${HOME_HEADING} m-0 max-w-[11ch] text-[36px] sm:text-[52px] lg:text-[72px]`}>
            Ils nous font confiance.
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[32px] font-semibold leading-none tracking-[-0.04em] text-[#161513]">4,3</span>
            <span role="img" aria-label="Note de 4,3 sur 5" className="flex gap-0.5">
              {[0, 1, 2, 3].map((index) => (
                <span key={index} className="flex h-8 w-8 items-center justify-center bg-[#00B67A] text-[22px] leading-none text-white">
                  ★
                </span>
              ))}
              <span
                className="flex h-8 w-8 items-center justify-center text-[22px] leading-none text-white"
                style={{ background: "linear-gradient(90deg,#00B67A 30%,#DCDCE6 30%)" }}
              >
                ★
              </span>
            </span>
            <span className={`text-[13px] text-[#5F5B53] ${HOME_MONO}`}>Avis clients de la métropole lilloise</span>
          </div>
          <Link href="/avis" className="mt-2 rounded-full bg-[#161513] px-6 py-3.5 text-[15px] font-medium text-[#F7F6F2]">
            Voir tous les avis →
          </Link>
        </div>

        <div
          className="grid h-[520px] grid-cols-2 gap-4 overflow-hidden sm:h-[600px] lg:h-[680px]"
          style={{ maskImage: "linear-gradient(180deg,transparent,#000 14%,#000 86%,transparent)" }}
        >
          {columns.map((column) => (
            <div key={column.direction} className="min-w-0 overflow-hidden">
              <div className={`flex flex-col gap-4 pb-4 ${column.direction === "up" ? "animate-home-scroll-up" : "animate-home-scroll-down"}`}>
                {column.items.map((item, index) => (
                  <ReviewCard key={`${item.name}-${index}`} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes home-scroll-up {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-50%);
          }
        }
        @keyframes home-scroll-down {
          from {
            transform: translateY(-50%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-home-scroll-up {
          animation: home-scroll-up 34s linear infinite;
        }
        .animate-home-scroll-down {
          animation: home-scroll-down 34s linear infinite;
        }
      `}</style>
    </section>
  );
}
