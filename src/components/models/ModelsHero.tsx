import Image from "next/image";
import Link from "next/link";
import { HOME_MONO, HOME_PILL_DARK, HOME_PILL_OUTLINE, HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";

export function ModelsHero() {
  return (
    <section
      aria-labelledby="modeles-title"
      className={HOME_SECTION_NO_TOP}
      style={{ paddingTop: "clamp(48px,8vw,104px)" }}
    >
      <div className="grid grid-cols-1 items-center gap-[clamp(40px,6vw,96px)] lg:grid-cols-2">
        <div className="flex flex-col items-start gap-7">
          <span className={HOME_MONO}>Nos modèles sur mesure</span>
          <h1 id="modeles-title" className="m-0 text-display text-black">
            Fabriqués à la main,{" "}
            <span className="am-highlight">avec le cœur.</span>
          </h1>
          <p className="m-0 max-w-[44ch] text-lead text-black/85">
            Derrière chaque meuble, il y a un menuisier de notre atelier lillois qui découpe, assemble et
            ponce chaque pièce. Chaque modèle est entièrement personnalisable : dimensions, matériaux,
            finitions.
          </p>
          <div className="flex items-center gap-2.5 text-[15px] text-black">
            <span
              aria-hidden="true"
              className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-am-navy text-[12px] text-am-mist"
            >
              ✓
            </span>
            <span>
              <strong className="font-semibold">Devis gratuit.</strong> Maquette 3D offerte.
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/demande-devis" className={HOME_PILL_DARK}>
              Demander un devis gratuit
            </Link>
            <a href="#collection-title" className={HOME_PILL_OUTLINE}>
              Voir les modèles
            </a>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[28px] bg-am-mist/25" style={{ aspectRatio: "1/1" }}>
          <Image
            src="https://images.unsplash.com/photo-1561297331-a9c00b9c2c44?auto=format&fit=crop&w=1200&q=75"
            alt="Menuisier qui ponce un panneau de bois clair à l'atelier"
            fill
            className="object-cover"
            unoptimized
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
}
