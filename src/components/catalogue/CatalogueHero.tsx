import { HOME_MONO, HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";

export function CatalogueHero() {
  return (
    <section
      aria-labelledby="boutique-title"
      className={HOME_SECTION_NO_TOP}
      style={{ paddingTop: "clamp(48px,8vw,104px)" }}
    >
      <div className={`mb-6 ${HOME_MONO}`}>Notre boutique</div>
      <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-2">
        <h1 id="boutique-title" className="m-0 text-display text-black">
          Les finitions <span className="am-highlight">qui changent tout.</span>
        </h1>
        <p className="m-0 max-w-[44ch] text-lead text-black/85">
          Découvrez notre sélection de produits et accessoires haut de gamme pour vos projets d&apos;aménagement.
        </p>
      </div>
    </section>
  );
}
