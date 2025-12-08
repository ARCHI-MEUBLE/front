const values = [
  {
    number: "01",
    title: "Au millimetre pres",
    description: "Chaque meuble est pense pour s adapter parfaitement a votre espace, sans compromis."
  },
  {
    number: "02",
    title: "Personnalisation complete",
    description: "Essences de bois, finitions, rangements : composez un meuble unique."
  },
  {
    number: "03",
    title: "Artisanat local",
    description: "Nos ateliers francais allient savoir-faire traditionnel et outils modernes."
  }
];

export function WhyChooseUs() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <p className="section-label">NOTRE ENGAGEMENT</p>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 lg:gap-16">
          {values.map((item, index) => (
            <div key={item.number} className={index === 1 ? "md:mt-8" : ""}>
              <span className="font-mono text-5xl text-muted">{item.number}</span>
              <h3 className="font-serif text-2xl text-ink mt-4">{item.title}</h3>
              <p className="text-stone mt-3 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
