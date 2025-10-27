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
    <section id="avis" className="bg-white py-20 scroll-mt-32">
      <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Avis</span>
          <h2 className="mt-4 text-3xl font-semibold text-gray-900 md:text-4xl">
            Ils ont imaginé leur meuble avec ArchiMeuble
          </h2>
          <p className="mt-4 text-base text-gray-600">
            Nos clients apprécient notre accompagnement personnalisé, la qualité des finitions et la durabilité de nos
            réalisations.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="flex h-full flex-col justify-between rounded-3xl bg-[#FFF9F1] p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <blockquote className="text-sm text-gray-700">“{testimonial.quote}”</blockquote>
              <figcaption className="mt-6 text-sm font-semibold text-gray-900">
                {testimonial.name}
                <span className="block text-xs font-medium text-gray-500">{testimonial.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
