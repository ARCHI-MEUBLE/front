import Link from "next/link";
import { HOME_SECTION, HOME_MONO } from "@/components/home/homeLayout";

const fileTypes = ["JPG", "PNG", "HEIC", "MP4", "MOV", "AVI"];

export function QuoteRequestCTA() {
  return (
    <section aria-labelledby="inspi-title" className={HOME_SECTION}>
      <div className="grid grid-cols-1 items-end gap-10 rounded-[20px] bg-[#161513] p-7 sm:p-10 lg:grid-cols-2 lg:p-16">
        <div>
          <h2 id="inspi-title" className="m-0 mb-5 text-[36px] font-medium leading-[0.98] tracking-[-0.05em] text-[#F7F6F2] sm:text-[52px] lg:text-[72px]">
            Un meuble vous plaît ?
          </h2>
          <p className="m-0 max-w-[46ch] text-[18px] text-[#D9D6CE]">
            Vous avez vu un meuble en magasin ou ailleurs qui vous inspire ? Envoyez-nous une{" "}
            <strong className="font-medium text-[#F7F6F2]">photo ou vidéo</strong> et nous vous ferons un{" "}
            <strong className="font-medium text-[#F7F6F2]">devis personnalisé</strong> pour le reproduire sur mesure.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/demande-devis"
            className="flex items-center gap-4 rounded-2xl border-[1.5px] border-dashed border-[#5F5B53] bg-white/[0.04] p-5 text-left text-[#F7F6F2] transition-colors hover:border-[#D4FF3A] hover:bg-[#D4FF3A]/[0.06]"
          >
            <span aria-hidden="true" className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-[#D4FF3A]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#161513" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4" />
                <path d="m6 10 6-6 6 6" />
                <path d="M4 20h16" />
              </svg>
            </span>
            <span className="flex min-w-0 flex-col gap-2">
              <span className="text-[17px] font-medium tracking-[-0.01em]">Déposez la photo ou la vidéo du meuble</span>
              <span className="flex flex-wrap gap-1.5">
                {fileTypes.map((type) => (
                  <span
                    key={type}
                    className={`rounded-full border border-[#3B3832] px-2.5 py-0.5 text-[11px] text-[#D9D6CE] ${HOME_MONO}`}
                  >
                    {type}
                  </span>
                ))}
              </span>
            </span>
          </Link>
          <Link
            href="/demande-devis"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#D4FF3A] px-7 py-4 text-[16px] font-medium text-[#161513] transition-transform duration-200 hover:-translate-y-0.5"
          >
            Demander un devis →
          </Link>
        </div>
      </div>
    </section>
  );
}
