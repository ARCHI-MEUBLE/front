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
    <section id="pourquoi" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <span className="text-xs font-medium uppercase tracking-[0.4em] text-ink/40">Pourquoi nous choisir ?</span>
          <h2 className="heading-serif mt-4 text-4xl leading-tight text-ink md:text-[44px]">
            La précision du sur-mesure ArchiMeuble
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink/70">
            De la conception à la pose, nos artisans orchestrent chaque détail pour créer un meuble qui sublime votre
            intérieur et résiste aux années.
          </p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className="rounded-[32px] border border-[#e7ded3] bg-alabaster/60 p-10 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="heading-serif text-2xl text-ink">{reason.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-ink/70">{reason.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
