import Link from "next/link";
import { HOME_SECTION } from "@/components/home/homeLayout";

export function FinalCtaSection() {
  return (
    <section aria-labelledby="cta-title" className={`${HOME_SECTION} pb-20 lg:pb-36`}>
      <div className="flex flex-col gap-10 rounded-[20px] border border-[#161513] bg-[#D4FF3A] p-7 sm:p-10 lg:p-20">
        <h2
          id="cta-title"
          className="m-0 max-w-[13ch] text-balance text-[44px] font-medium leading-[0.95] tracking-[-0.055em] text-[#161513] sm:text-[72px] lg:text-[120px]"
        >
          Prêt à créer votre meuble unique ?
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/demande-devis"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#161513] px-7 py-4 text-[16px] font-medium text-[#F7F6F2] transition-transform duration-200 hover:-translate-y-0.5"
          >
            Commencer maintenant →
          </Link>
          <a href="tel:+33601062867" className="border-b border-[#161513] py-1 font-[Geist_Mono] text-[15px] text-[#161513]">
            06 01 06 28 67
          </a>
        </div>
      </div>
    </section>
  );
}
