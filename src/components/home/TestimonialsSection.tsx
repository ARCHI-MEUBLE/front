const testimonials = [
  {
    name: "Claire & Julien",
    role: "Projet dressing sur-mesure",
    quote:
      "Une équipe à l’écoute, des délais respectés et un résultat impeccable. Notre dressing optimise chaque centimètre !",
  },
  {
    name: "Thomas",
    role: "Bibliothèque cintrée",
    quote:
      "Le rendu est au-delà de nos attentes : finitions impeccables et installation sans surprise. Merci ArchiMeuble !",
  },
  {
    name: "Sonia",
    role: "Bureau professionnel",
    quote:
      "Des matériaux nobles et un accompagnement premium. Mon bureau est devenu un véritable espace de travail inspirant.",
  },
];

export function TestimonialsSection() {
  return (
    <section id="avis" className="bg-white py-24 scroll-mt-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <span className="text-xs font-medium uppercase tracking-[0.4em] text-ink/40">Avis</span>
          <h2 className="heading-serif mt-4 text-4xl leading-tight text-ink md:text-[44px]">
            Ils ont imaginé leur meuble avec ArchiMeuble
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink/70">
            Nos clients louent notre accompagnement attentif, la précision du geste artisanal et la qualité durable des
            finitions.
          </p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="flex h-full flex-col justify-between rounded-[32px] border border-[#e7ded3] bg-alabaster/70 p-10 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <blockquote className="text-sm leading-relaxed text-ink/70">“{testimonial.quote}”</blockquote>
              <figcaption className="mt-8 text-sm font-semibold text-ink">
                {testimonial.name}
                <span className="block text-xs font-medium uppercase tracking-[0.3em] text-ink/50">{testimonial.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
