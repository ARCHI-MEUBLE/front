import Link from "next/link";

const featuredTestimonial = {
  name: "CLAIRE & JULIEN",
  role: "Dressing sur-mesure",
  quote: "Une equipe a l ecoute, des delais respectes et un resultat impeccable. Notre dressing optimise chaque centimetre de notre chambre."
};

export function TestimonialsSection() {
  return (
    <section className="bg-cream py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <blockquote>
          <p className="font-serif text-2xl md:text-4xl text-ink italic leading-relaxed">
            {featuredTestimonial.quote}
          </p>
        </blockquote>
        <figcaption className="mt-10">
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-ink">
            {featuredTestimonial.name}
          </p>
          <p className="text-sm text-muted mt-1">
            {featuredTestimonial.role}
          </p>
        </figcaption>
        <div className="mt-12">
          <Link href="/avis" className="btn-secondary">
            Lire tous les avis
          </Link>
        </div>
      </div>
    </section>
  );
}
