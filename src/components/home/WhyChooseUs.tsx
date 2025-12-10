const reasons = [
  {
    number: "01",
    title: "Au millimètre",
    description: "Chaque meuble épouse parfaitement votre espace. Pas de compromis sur les dimensions.",
  },
  {
    number: "02",
    title: "Votre style",
    description: "Essences, teintes, poignées — vous composez un meuble unique qui vous ressemble.",
  },
  {
    number: "03",
    title: "Fait à Lille",
    description: "Notre atelier lillois allie savoir-faire traditionnel et précision moderne.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="bg-white py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
              Pourquoi nous
            </span>
            <h2 className="mt-4 font-serif text-3xl leading-[1.1] tracking-[-0.02em] text-[#1A1917] sm:text-4xl lg:text-5xl">
              La précision du
              <br />
              sur-mesure
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-[#706F6C] lg:text-right">
            Du premier croquis à l'installation, chaque détail est pensé
            pour créer un meuble qui traverse les années.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:mt-20 lg:grid-cols-3">
          {reasons.map((reason) => (
            <div
              key={reason.number}
              className="group relative border border-[#E8E6E3] bg-[#FAFAF9] p-6 transition-colors duration-200 hover:border-[#1A1917] sm:p-8 lg:p-10"
            >
              {/* Number */}
              <span className="font-mono text-xs text-[#8B7355]">{reason.number}</span>

              {/* Title */}
              <h3 className="mt-4 font-serif text-xl text-[#1A1917] sm:mt-6 sm:text-2xl">{reason.title}</h3>

              {/* Description */}
              <p className="mt-3 text-sm leading-relaxed text-[#706F6C] sm:mt-4">
                {reason.description}
              </p>

              {/* Corner accent on hover */}
              <div className="absolute right-0 top-0 h-8 w-8 origin-top-right scale-0 bg-[#1A1917] transition-transform duration-200 group-hover:scale-100 sm:h-12 sm:w-12" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
