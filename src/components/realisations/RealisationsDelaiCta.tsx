import Image from "next/image";
import Link from "next/link";

export function RealisationsDelaiCta() {
  return (
    <section aria-labelledby="delai-title" style={{ paddingTop: "clamp(80px,10vw,144px)" }}>
      <div className="relative flex items-center overflow-hidden bg-am-wine" style={{ minHeight: "clamp(420px,46vw,620px)" }}>
        <Image
          src="https://images.unsplash.com/photo-1497219055242-93359eeed651?auto=format&fit=crop&w=2000&q=70"
          alt=""
          fill
          unoptimized
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.62) 55%,rgba(0,0,0,0.72) 100%)" }}
        />
        <div className="relative mx-auto flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-x-16 gap-y-10 px-[clamp(20px,4vw,48px)] py-[clamp(48px,6vw,80px)] text-white">
          <h2
            id="delai-title"
            className="m-0 max-w-[11ch] font-[Geist] font-medium leading-none tracking-[-0.05em] text-white"
            style={{ fontSize: "clamp(36px,4.6vw,68px)" }}
          >
            Fabriqué à Lille, posé chez vous :
          </h2>
          <div className="ml-auto flex flex-col items-end gap-2.5 text-right">
            <span className="text-white" style={{ fontSize: "clamp(16px,1.4vw,20px)" }}>
              De la validation à la pose
            </span>
            <span className="font-medium leading-[0.9] tracking-[-0.06em] text-white" style={{ fontSize: "clamp(72px,10vw,150px)" }}>
              30 jours
            </span>
            <span className="mt-2 font-medium tracking-[-0.03em] text-white" style={{ fontSize: "clamp(20px,2vw,30px)" }}>
              Montage et finitions compris.
            </span>
            <Link
              href="/demande-devis"
              className="mt-5 inline-flex min-h-[56px] items-center justify-center rounded-full bg-am-mist px-8 py-[18px] text-[16px] font-medium text-black"
            >
              Demander un devis
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
