const categories = [
  "Dressing",
  "Bibliothèque",
  "Buffet",
  "Bureau",
  "Meuble TV",
  "Meuble sous-escalier",
  "Tête de lit",
  "Cloison atelier",
];

export function CategoriesSection() {
  return (
    <section id="creations" className="bg-[#FAFAFA] py-20">
      <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
        <div className="max-w-3xl text-center md:mx-auto">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Nos créations de meubles sur mesure</span>
          <h2 className="mt-4 text-3xl font-semibold text-gray-900 md:text-4xl">Des pièces pensées pour chaque pièce</h2>
          <p className="mt-4 text-base text-gray-600">
            Rangements optimisés, bibliothèques aériennes ou bureaux élégants : explorez nos réalisations emblématiques
            et imaginez la vôtre.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <div
              key={category}
              className="flex h-36 flex-col justify-between rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100 transition hover:-translate-y-1 hover:shadow-md"
            >
              <p className="text-lg font-semibold text-gray-900">{category}</p>
              <span className="text-sm font-medium text-accent">Découvrir</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
