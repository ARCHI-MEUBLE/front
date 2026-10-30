import Link from "next/link";
import { HOME_MONO, HOME_PILL_DARK, HOME_PILL_OUTLINE, HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";

// Bandeau volontairement compact : le carrousel de la collection doit être visible dès l'arrivée sur la page
export function ModelsHero() {
  return (
    <section
      aria-labelledby="modeles-title"
      className={HOME_SECTION_NO_TOP}
      style={{ paddingTop: "clamp(32px,4vw,56px)" }}
    >
      <div className="flex flex-col items-start gap-4">
        <span className={HOME_MONO}>Nos modèles sur mesure</span>
        <h1 id="modeles-title" className="m-0 text-heading text-black xl:text-6xl">
          Fabriqués à la main, <span className="am-highlight">avec le cœur.</span>
        </h1>
      </div>
      <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between xl:gap-12">
        <p className="m-0 max-w-[62ch] text-[15px] leading-relaxed text-black/75">
          Chaque meuble est découpé, assemblé et poncé dans notre atelier lillois, entièrement personnalisable :
          dimensions, matériaux, finitions. <strong className="font-semibold text-black">Devis gratuit</strong>,
          maquette 3D offerte.
        </p>
        <div className="flex flex-none flex-wrap gap-2.5">
          <Link href="/demande-devis" className={HOME_PILL_DARK}>
            Demander un devis gratuit
          </Link>
          <a href="#collection-title" className={HOME_PILL_OUTLINE}>
            Voir les modèles
          </a>
        </div>
      </div>
    </section>
  );
}
