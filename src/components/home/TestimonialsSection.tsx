import Link from "next/link";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "Un travail remarquable du début à la fin. Notre bibliothèque s'intègre parfaitement dans le salon, comme si elle avait toujours été là.",
    name: "Marie-Claire D.",
    location: "Lille",
    rating: 5,
    featured: true,
  },
  {
    quote: "Le configurateur en ligne est vraiment bien fait. J'ai pu visualiser mon dressing avant de commander.",
    name: "Thomas L.",
    location: "Roubaix",
    rating: 5,
    featured: false,
  },
  {
    quote: "Livraison dans les temps et pose impeccable. Les menuisiers sont arrivés à l'heure et ont tout nettoyé en partant.",
    name: "Sophie M.",
    location: "Marcq-en-Baroeul",
    rating: 5,
    featured: false,
  },
  {
    quote: "Rapport qualité-prix excellent. On a comparé avec d'autres artisans et ArchiMeuble était le plus compétitif.",
    name: "Jean-Pierre B.",
    location: "Tourcoing",
    rating: 5,
    featured: false,
  },
];

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const starSize = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`${starSize} ${i < rating ? "fill-[#1A1917] text-[#1A1917]" : "fill-[#E8E6E3] text-[#E8E6E3]"}`}
        />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  const featured = testimonials.find((t) => t.featured);
  const others = testimonials.filter((t) => !t.featured);

  return (
    <section className="bg-[#FAFAF9] py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
            Témoignages
          </span>
          <h2 className="mt-4 font-sans text-3xl font-bold tracking-[-0.02em] text-[#1A1917] sm:text-4xl">
            Ils nous font confiance
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-medium text-[#706F6C]">
            Découvrez les avis de nos clients satisfaits
          </p>
        </div>

        {/* Grid */}
        <div className="mt-12 grid gap-4 sm:mt-16 lg:grid-cols-3">
          {/* Featured Card */}
          {featured && (
            <div className="flex flex-col justify-between border border-[#E8E6E3] bg-white p-6 sm:p-8 lg:row-span-2">
              <div>
                <StarRating rating={featured.rating} size="lg" />
                <blockquote className="mt-6">
                  <p className="font-sans text-xl font-bold leading-relaxed text-[#1A1917] sm:text-2xl">
                    « {featured.quote} »
                  </p>
                </blockquote>
              </div>
              <div className="mt-8">
                <p className="font-bold text-[#1A1917]">{featured.name}</p>
                <p className="text-sm font-medium text-[#706F6C]">{featured.location}</p>
              </div>
            </div>
          )}

          {/* Other Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {others.map((testimonial, index) => (
              <div
                key={index}
                className="flex flex-col justify-between border border-[#E8E6E3] bg-white p-5 sm:p-6"
              >
                <div>
                  <StarRating rating={testimonial.rating} />
                  <blockquote className="mt-4">
                    <p className="font-medium leading-relaxed text-[#706F6C]">
                      « {testimonial.quote} »
                    </p>
                  </blockquote>
                </div>
                <div className="mt-5">
                  <p className="text-sm font-bold text-[#1A1917]">{testimonial.name}</p>
                  <p className="text-xs font-medium text-[#706F6C]">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center sm:mt-12">
          <Link
            href="/avis"
            className="inline-flex h-12 items-center justify-center border border-[#1A1917] px-8 text-sm font-medium text-[#1A1917] transition-colors hover:bg-[#1A1917] hover:text-white"
          >
            Voir tous les avis
          </Link>
        </div>
      </div>
    </section>
  );
}
