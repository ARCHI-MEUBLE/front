import Link from "next/link";
import { HOME_SECTION } from "@/components/home/homeLayout";

export function AvisCta() {
  return (
    <section aria-labelledby="avis-cta" className={HOME_SECTION}>
      <div className="flex flex-wrap items-end justify-between gap-8 rounded-[20px] bg-[#161513] p-[clamp(28px,5vw,64px)] text-[#F7F6F2]">
        <div>
          <h2
            id="avis-cta"
            className="m-0 mb-4 font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-[#F7F6F2]"
            style={{ fontSize: "clamp(32px,4.4vw,64px)" }}
          >
            Votre projet sur mesure
          </h2>
          <p className="m-0 max-w-[46ch] text-[17px] text-[#CFCBC0]">
            Chaque espace est unique. Discutons de votre projet et créons ensemble le meuble parfait pour votre
            intérieur.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/demande-devis"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#D4FF3A] bg-[#D4FF3A] px-6 py-3.5 text-[15px] font-medium text-[#161513] transition-transform duration-200 hover:-translate-y-0.5"
          >
            Demander un devis gratuit
          </Link>
          <Link
            href="/realisations"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#5F5B53] px-6 py-3.5 text-[15px] text-[#F7F6F2] transition-colors duration-200 hover:bg-white/[0.06]"
          >
            Voir nos réalisations
          </Link>
        </div>
      </div>
    </section>
  );
}
