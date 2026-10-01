import Image from "next/image";
import Link from "next/link";
import { HOME_SECTION } from "@/components/home/homeLayout";

const DETAIL_ROWS = [
  { label: "Caissons chêne", sub: "3 modules", price: "1 640 €" },
  { label: "Portes laquées", sub: "Blanc opalin", price: "590 €" },
  { label: "Pose à domicile", sub: "Lille", price: "250 €" },
];

export function ContactUniqueSection() {
  return (
    <section aria-labelledby="contact-unique-title" className={HOME_SECTION}>
      <div
        className="grid grid-cols-1 gap-[clamp(24px,4vw,56px)] overflow-hidden rounded-[20px] bg-[#EDEBE4] lg:grid-cols-2"
        style={{ padding: "clamp(28px,5vw,64px) clamp(24px,5vw,64px) 0" }}
      >
        <div className="flex flex-col items-start gap-6" style={{ paddingBottom: "clamp(28px,5vw,64px)" }}>
          <Image
            src="/images/devis-illustration.svg"
            alt=""
            width={200}
            height={200}
            style={{ width: "clamp(140px,16vw,200px)", height: "auto", alignSelf: "flex-end", marginBottom: "auto" }}
          />
          <h2
            id="contact-unique-title"
            className="m-0 font-[Geist] font-medium leading-[1.05] tracking-[-0.045em] text-[#161513]"
            style={{ fontSize: "clamp(28px,3vw,44px)", marginTop: 24 }}
          >
            Un seul interlocuteur, basé à Lille
          </h2>
          <p className="m-0 max-w-[42ch] text-[#3B3832]" style={{ fontSize: "clamp(17px,1.4vw,20px)" }}>
            Gauthier suit votre projet de la maquette 3D jusqu&apos;à la pose. Vous gardez le même contact du premier
            appel à la livraison.
          </p>
          <Link
            href="/demande-devis"
            className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-[#161513] px-8 py-[18px] text-[16px] font-medium text-[#F7F6F2]"
          >
            Demander un devis
          </Link>
        </div>

        <div aria-hidden="true" className="relative" style={{ minHeight: 380 }}>
          <div className="absolute left-[4%] right-[2%] top-0 origin-top-left" style={{ transform: "rotate(-2.5deg)" }}>
            <div className="flex items-center justify-between rounded-t-[10px] bg-[#D4FF3A] px-[22px] py-[18px] shadow-[0_0_0_1px_rgba(22,21,19,0.06),0_24px_48px_-20px_rgba(22,21,19,0.25)]">
              <span className="flex items-center gap-3">
                <div className="relative h-[52px] w-[52px] overflow-hidden rounded-full border-[3px] border-white">
                  <Image src="/images/gauthier-hue.jpeg" alt="" fill className="object-cover" style={{ objectPosition: "50% 25%" }} />
                </div>
                <span className="text-[15px] font-semibold">Gauthier Hue</span>
              </span>
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] border-[#161513] font-[Geist_Mono] text-[14px] font-semibold">
                i
              </span>
            </div>
            <div className="mt-2.5 flex flex-col items-center gap-[18px] rounded-t-[10px] bg-white px-7 pb-10 pt-7 shadow-[0_0_0_1px_rgba(22,21,19,0.06),0_24px_48px_-20px_rgba(22,21,19,0.25)]">
              <span className="text-[17px] font-medium">Dressing d&apos;angle · Devis</span>
              <span className="font-medium leading-none tracking-[-0.06em]" style={{ fontSize: "clamp(48px,5.4vw,80px)" }}>
                2 480 €
              </span>
              <div className="mt-2 w-full rounded-lg bg-[#F7F6F2] px-[18px] pb-1 pt-1.5">
                <div className="px-0 py-3 text-[15px] font-medium">Détail</div>
                {DETAIL_ROWS.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4 border-t border-[#E5E2D9] py-3.5">
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[16px]">{row.label}</span>
                      <span className="text-[14px] text-[#5F5B53]">{row.sub}</span>
                    </span>
                    <span className="whitespace-nowrap font-[Geist_Mono] text-[14px]">{row.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
