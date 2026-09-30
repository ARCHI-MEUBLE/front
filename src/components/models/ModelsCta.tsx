import Image from "next/image";
import Link from "next/link";
import { HOME_SECTION } from "@/components/home/homeLayout";

export function ModelsCta() {
  return (
    <section aria-labelledby="bonheur-title" className={HOME_SECTION}>
      <div className="grid grid-cols-1 items-end gap-8 rounded-[20px] bg-[#161513] p-[clamp(28px,5vw,64px)] text-[#F7F6F2] lg:grid-cols-2">
        <div>
          <div className="mb-4 font-[Geist_Mono] text-[12px] uppercase tracking-[0.04em] text-[#D4FF3A]">
            Projet sur mesure
          </div>
          <h2
            id="bonheur-title"
            className="m-0 mb-4 font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-[#F7F6F2]"
            style={{ fontSize: "clamp(36px,5vw,72px)" }}
          >
            Vous ne trouvez pas votre bonheur ?
          </h2>
          <p className="m-0 max-w-[46ch] text-[17px] text-[#CFCBC0]">
            Nous réalisons tous types de meubles sur mesure. Partagez-nous votre projet et nous vous
            accompagnons de la conception à l&apos;installation.
          </p>
        </div>
        <div className="flex flex-col items-end gap-6">
          <Image
            src="/images/loupe.svg"
            alt=""
            aria-hidden="true"
            width={200}
            height={200}
            style={{ width: "clamp(120px,14vw,200px)", height: "auto" }}
          />
          <div className="flex flex-wrap justify-end gap-2.5">
            <Link
              href="/demande-devis"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#D4FF3A] bg-[#D4FF3A] px-6 py-3.5 text-[15px] font-medium text-[#161513] transition-transform duration-200 hover:-translate-y-0.5"
            >
              Demander un devis gratuit
            </Link>
            <Link
              href="/samples"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#5F5B53] px-6 py-3.5 text-[15px] text-[#F7F6F2] transition-colors duration-200 hover:bg-white/[0.06]"
            >
              Commander des échantillons
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
