const filters = ["Couleur", "Type", "Matériaux", "Finition", "Nouveauté"];

export function FiltersBar() {
  return (
    <section className="border-b border-[#e0d7cc] bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-4">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className="rounded-full border border-[#d7c9b9] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-ink/60 transition hover:border-ink hover:text-ink"
          >
            {filter}
          </button>
        ))}
      </div>
    </section>
  );
}
