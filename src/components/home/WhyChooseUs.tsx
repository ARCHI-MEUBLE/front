const reasons = [
  {
    title: "Au millimètre près",
    description:
      "Chaque meuble est pensé pour s’adapter parfaitement à votre espace, sans compromis sur la précision.",
  },
  {
    title: "Personnalisation complète",
    description:
      "Essences de bois, finitions, rangements : composez un meuble unique qui répond à vos usages et à votre style.",
  },
  {
    title: "Artisanat local",
    description:
      "Nos ateliers français allient savoir-faire traditionnel et outils modernes pour une qualité durable.",
  },
];

export function WhyChooseUs() {
  return (
    <section id="pourquoi" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Pourquoi nous choisir ?</span>
          <h2 className="mt-4 text-3xl font-semibold text-gray-900 md:text-4xl">La précision du sur-mesure ArchiMeuble</h2>
          <p className="mt-4 text-base text-gray-600">
            Notre accompagnement de la conception à la pose garantit un rendu impeccable et durable, adapté à vos envies.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className="rounded-3xl border border-orange-100 bg-[#FFF9F1] p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900">{reason.title}</h3>
              <p className="mt-3 text-sm text-gray-600">{reason.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
