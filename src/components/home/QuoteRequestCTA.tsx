import Link from "next/link";
import { HOME_SECTION } from "@/components/home/homeLayout";

const FILE_TYPES = ["JPG", "PNG", "HEIC", "MP4", "MOV", "AVI"];

export function QuoteRequestCTA() {
  return (
    <section aria-labelledby="inspi-title" className={HOME_SECTION}>
      <div className="grid grid-cols-1 items-end gap-10 rounded-[20px] bg-am-wine p-[clamp(28px,5vw,64px)] text-white lg:grid-cols-2">
        <div>
          <h2
            id="inspi-title"
            className="m-0 mb-5 font-sans font-medium leading-[0.98] tracking-[-0.05em] text-white"
            style={{ fontSize: "clamp(36px,5vw,72px)" }}
          >
            Un meuble vous plaît ?
          </h2>
          <p className="m-0 max-w-[46ch] text-[18px] text-white/80">
            Vous avez vu un meuble en magasin ou ailleurs qui vous inspire ? Envoyez-nous une{" "}
            <strong className="font-medium text-white">photo ou vidéo</strong> et nous vous ferons un{" "}
            <strong className="font-medium text-white">devis personnalisé</strong> pour le reproduire sur
            mesure.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/demande-devis"
            className="flex w-full items-center gap-[18px] rounded-2xl border-[1.5px] border-dashed border-white/40 bg-white/[0.04] p-[22px] text-left text-white transition-colors duration-200 hover:border-am-mist hover:bg-am-mist/[0.06]"
          >
            <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-am-mist" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4" />
                <path d="m6 10 6-6 6 6" />
                <path d="M4 20h16" />
              </svg>
            </span>
            <span className="flex min-w-0 flex-col gap-2">
              <span className="text-[17px] font-medium tracking-[-0.01em]">Déposez la photo ou la vidéo du meuble</span>
              <span className="flex flex-wrap gap-1.5">
                {FILE_TYPES.map((type) => (
                  <span key={type} className="rounded-full border border-white/40 px-2.5 py-1 font-mono text-[11px] text-white/80">
                    {type}
                  </span>
                ))}
              </span>
            </span>
          </Link>
          <Link
            href="/demande-devis"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-am-mist px-7 py-4 text-[16px] font-medium text-black transition-transform duration-200 hover:-translate-y-0.5"
          >
            Demander un devis →
          </Link>
        </div>
      </div>
    </section>
  );
}
