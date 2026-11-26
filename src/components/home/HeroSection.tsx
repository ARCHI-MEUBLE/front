import Image from "next/image";
import Link from "next/link";
import { HOME_MONO_SM, HOME_PILL_OUTLINE, HOME_PILL_WINE, HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";

export function HeroSection() {
  return (
    <>
      <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
        {/* Fond du bandeau : quadrillage et plan coté d'une bibliothèque, calé à droite. Sur grand écran (xl), l'image
            entière tient dans la hauteur ; à gauche, le SVG s'efface lui-même vers le fond de page, sans raccord visible.
            En dessous, le bandeau est trop étroit pour cela (bandes vides en haut et en bas) : l'image le couvre.
            Atténuée sur téléphone, où le plan passe sous le texte. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG décoratif, rien à optimiser */}
        <img
          src="/images/home/plan-fond.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover object-right opacity-50 md:opacity-100 xl:object-contain"
        />
        {/* Fondu du quadrillage vers le fond de page : le bandeau se termine sans arête nette */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-20 bg-gradient-to-b from-transparent to-am-paper" />
        <div className={`${HOME_SECTION_NO_TOP} flex min-h-[clamp(560px,77vh,830px)] flex-col justify-center py-[clamp(48px,6vw,96px)]`}>
          <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-black/70">
            <span>Menuisier à Lille</span>
            <span>Atelier, 30 rue Henri Regnault</span>
          </div>
          <h1 id="hero-title" className="m-0 text-title text-black">
            <span className="block">Meubles sur mesure,</span>
            <span className="block">
              faits pour <span className="am-highlight">durer.</span>
            </span>
          </h1>
          <p className="mb-0 mt-6 max-w-[40ch] text-lead text-black/85">
            Chaque pièce est dessinée pour votre espace, fabriquée dans notre atelier lillois, livrée chez vous.
          </p>
          <div className="mt-8 flex flex-col items-start gap-3">
            <div className="flex flex-wrap gap-2.5">
              <Link href="/models" className={HOME_PILL_WINE}>Configurer mon meuble →</Link>
              <Link href="/realisations" className={HOME_PILL_OUTLINE}>Voir les réalisations</Link>
            </div>
            <a
              href="tel:+33601062867"
              className="inline-flex min-h-11 items-center text-[15px] text-black underline decoration-black/30 underline-offset-4 hover:decoration-black"
            >
              Ou appelez l&apos;atelier : 06 01 06 28 67
            </a>
          </div>
        </div>
      </section>
      <div className={`${HOME_SECTION_NO_TOP} pt-6`}>
        <figure className="relative m-0 overflow-hidden rounded-2xl border border-black/15 bg-am-mist/25" style={{ aspectRatio: "16/9" }}>
          <Image
            src="/images/accueil image/img.png"
            alt="Bibliothèque sur mesure ArchiMeuble"
            fill
            sizes="(min-width: 1360px) 1264px, 100vw"
            className="object-cover"
            preload
          />
          <figcaption className="absolute bottom-4 left-4 flex max-w-[calc(100%-2rem)] flex-col gap-0.5 rounded-[10px] border border-black bg-am-paper px-3.5 py-2.5">
            <span className={HOME_MONO_SM}>Réalisation récente</span>
            <span className="text-[15px] font-medium leading-tight text-black">Bibliothèque sur mesure, Lille, 2024</span>
          </figcaption>
        </figure>
      </div>
    </>
  );
}
