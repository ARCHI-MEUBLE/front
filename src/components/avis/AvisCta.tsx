import Link from "next/link";
import { HOME_SECTION } from "@/components/home/homeLayout";

export function AvisCta() {
  return (
    <section aria-labelledby="avis-cta" className={HOME_SECTION}>
      <div className="flex flex-wrap items-end justify-between gap-8 rounded-[20px] bg-am-wine p-[clamp(28px,5vw,64px)] text-white">
        <div>
          <h2
            id="avis-cta"
            className="m-0 mb-4 font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-white"
            style={{ fontSize: "clamp(32px,4.4vw,64px)" }}
          >
            Votre projet sur mesure
          </h2>
          <p className="m-0 max-w-[46ch] text-[17px] text-white/80">
            Chaque espace est unique. Discutons de votre projet et créons ensemble le meuble parfait pour votre
            intérieur.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/demande-devis"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-am-mist bg-am-mist px-6 py-3.5 text-[15px] font-medium text-black transition-transform duration-200 hover:-translate-y-0.5"
          >
            Demander un devis gratuit
          </Link>
          <Link
            href="/realisations"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/40 px-6 py-3.5 text-[15px] text-white transition-colors duration-200 hover:bg-white/[0.06]"
          >
            Voir nos réalisations
          </Link>
        </div>
      </div>
    </section>
  );
}
