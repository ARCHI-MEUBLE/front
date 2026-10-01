import Image from "next/image";
import { HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";

export function RealisationsHero() {
  return (
    <section
      aria-labelledby="real-title"
      className={HOME_SECTION_NO_TOP}
      style={{ paddingTop: "clamp(40px,7vw,96px)" }}
    >
      <div className="grid grid-cols-1 items-center gap-[clamp(48px,6vw,96px)] lg:grid-cols-2">
        <h1
          id="real-title"
          className="m-0 font-[Geist] font-medium leading-[0.94] tracking-[-0.055em] text-[#161513]"
          style={{ fontSize: "clamp(48px,6.6vw,104px)" }}
        >
          Nos réalisations <span className="rounded-[0.08em] bg-[#D4FF3A] px-[0.12em]">sur mesure</span>
        </h1>

        <div
          aria-hidden="true"
          className="relative mx-auto w-full max-w-[600px]"
          style={{ aspectRatio: "1/1.02", containerType: "inline-size" }}
        >
          <div className="absolute left-0 overflow-hidden rounded-[22px] bg-[#ECE9E1]" style={{ top: "6%", width: "78%", height: "84%" }}>
            <Image
              src="https://images.unsplash.com/photo-1679797850019-3d0d8659a695?auto=format&fit=crop&w=1100&q=75"
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          </div>

          <div
            className="absolute flex items-center gap-2 rounded-md bg-[#D4FF3A] shadow-[0_0_0_1px_rgba(22,21,19,0.06),0_16px_40px_-12px_rgba(22,21,19,0.22)]"
            style={{ left: "-3%", top: "12%", padding: "2.4cqi 3.4cqi" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#161513" strokeWidth={1.8} strokeLinejoin="round" style={{ width: "4.4cqi", height: "4.4cqi" }}>
              <path d="M3 21h18M5 21V8l7-5 7 5v13" />
            </svg>
            <span className="whitespace-nowrap font-semibold tracking-[-0.03em]" style={{ fontSize: "clamp(14px,4cqi,24px)" }}>
              Projet livré
            </span>
          </div>

          <div
            className="absolute right-0 top-0 flex flex-col gap-[2cqi] rounded-md bg-white shadow-[0_0_0_1px_rgba(22,21,19,0.06),0_16px_40px_-12px_rgba(22,21,19,0.22)]"
            style={{ width: "40%", padding: "2cqi" }}
          >
            <div className="relative overflow-hidden rounded-sm bg-[#ECE9E1]" style={{ aspectRatio: "4/3" }}>
              <Image
                src="https://images.unsplash.com/photo-1649361811423-a55616f7ab11?auto=format&fit=crop&w=1100&q=75"
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <div className="flex flex-col gap-[0.8cqi] px-[1cqi] pb-[1cqi]">
              <span className="font-semibold tracking-[-0.02em]" style={{ fontSize: "clamp(12px,3cqi,17px)" }}>
                Dressing ouvert
              </span>
              <span className="font-[Geist_Mono] uppercase tracking-[0.05em] text-[#5F5B53]" style={{ fontSize: "clamp(9px,1.9cqi,11px)" }}>
                Lille · 2025
              </span>
            </div>
          </div>

          <div
            className="absolute right-0 flex flex-col rounded-md bg-white shadow-[0_0_0_1px_rgba(22,21,19,0.06),0_16px_40px_-12px_rgba(22,21,19,0.22)]"
            style={{ top: "44%", width: "44%" }}
          >
            <div className="border-b border-[#EDEBE4] font-semibold tracking-[-0.02em]" style={{ padding: "2.6cqi 3.2cqi", fontSize: "clamp(12px,2.8cqi,16px)" }}>
              Suivi du projet
            </div>
            <div className="flex flex-col gap-[1.6cqi]" style={{ padding: "2.6cqi 3.2cqi 3.2cqi" }}>
              <span className="text-[#3B3832]" style={{ fontSize: "clamp(11px,2.4cqi,13px)" }}>
                3 sur 5 étapes
              </span>
              <span className="mb-[0.6cqi] block h-1.5 overflow-hidden rounded-full bg-[#EDEBE4]">
                <span className="block h-full w-[60%] border-r border-[#161513] bg-[#D4FF3A]" />
              </span>
              {[
                { label: "Maquette 3D", done: true },
                { label: "Prise de mesures", done: true },
                { label: "Fabrication à l'atelier", done: false },
              ].map((step) => (
                <div
                  key={step.label}
                  className="flex items-center gap-[2cqi] rounded-md border border-[#E5E2D9]"
                  style={{ padding: "1.8cqi 2.2cqi", fontSize: "clamp(11px,2.5cqi,14px)" }}
                >
                  <span
                    className="flex flex-none items-center justify-center rounded-sm"
                    style={{
                      width: "3.4cqi",
                      height: "3.4cqi",
                      minWidth: 14,
                      minHeight: 14,
                      fontSize: "clamp(9px,2cqi,11px)",
                      background: step.done ? "#161513" : "transparent",
                      color: "#D4FF3A",
                      border: step.done ? "none" : "1.5px solid #CFCBC0",
                    }}
                  >
                    {step.done ? "✓" : ""}
                  </span>
                  <span className={step.done ? "text-[#5F5B53] line-through decoration-[#CFCBC0]" : "font-medium text-[#161513]"}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 left-[30%] w-[46%]">
            <span
              className="relative z-10 inline-flex items-center gap-[1.4cqi] whitespace-nowrap rounded-md bg-[#D4FF3A] font-semibold shadow-[0_0_0_1px_rgba(22,21,19,0.06),0_16px_40px_-12px_rgba(22,21,19,0.22)]"
              style={{ margin: "0 0 -1.6cqi 18%", padding: "1.4cqi 2.4cqi", fontSize: "clamp(11px,2.5cqi,14px)" }}
            >
              Votre meuble est prêt !
            </span>
            <div
              className="rounded-md bg-white shadow-[0_0_0_1px_rgba(22,21,19,0.06),0_16px_40px_-12px_rgba(22,21,19,0.22)]"
              style={{ padding: "3.4cqi 3.2cqi 2.8cqi", fontSize: "clamp(12px,2.8cqi,16px)", lineHeight: 1.35 }}
            >
              Pose prévue jeudi à 9 h
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
