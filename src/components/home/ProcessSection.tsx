import Image from "next/image";
import { HOME_SECTION } from "@/components/home/homeLayout";
import { PROCESS } from "@/components/home/homeData";

export function ProcessSection() {
  return (
    <section aria-labelledby="process-title" className={HOME_SECTION}>
      <h2
        id="process-title"
        className="mx-auto mb-14 max-w-[16ch] text-center font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-black"
        style={{ fontSize: "clamp(36px,5vw,72px)" }}
      >
        De la demande à la pose, un interlocuteur unique.
      </h2>
      <div className="relative mx-auto min-h-[340px] max-w-[880px]" style={{ aspectRatio: "16/9" }}>
        <div className="absolute bottom-[10%] left-[8%] right-[8%] top-0 rounded-3xl bg-am-navy" />
        <div className="absolute bottom-[6%] left-[4%] right-[4%] top-[4%] rounded-3xl bg-am-red" />
        <div className="absolute inset-x-0 bottom-0 top-[8%] overflow-hidden rounded-3xl border border-black bg-am-mist shadow-[0_40px_80px_-40px_rgba(0,0,0,0.55)]">
          {PROCESS.map((step, index) => (
            <div
              key={step.title}
              className="home-fade-slide absolute inset-0 grid"
              style={{ gridTemplateColumns: "minmax(0,0.9fr) minmax(0,1.1fr)", animationDelay: `${index * -3600}ms` }}
            >
              <div className="relative overflow-hidden bg-am-paper">
                <Image src={step.image} alt={`Étape ${step.title}`} fill className="object-cover" unoptimized />
                <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full border border-black bg-am-paper px-3 py-1 text-[13px] font-medium text-black">
                  {step.title}
                </span>
              </div>
              <div className="flex min-w-0 flex-col justify-between gap-5 p-[clamp(22px,3.4vw,48px)]">
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full border border-black bg-am-paper px-3 py-1 font-[Geist_Mono] text-[13px] text-black">
                    {String(index + 1).padStart(2, "0")} / 05
                  </span>
                  <span className="font-[Geist_Mono] text-[13px] text-black/70">{step.tag}</span>
                </div>
                <div>
                  <h3
                    className="m-0 mb-3.5 font-[Geist] font-medium leading-none tracking-[-0.045em] text-black"
                    style={{ fontSize: "clamp(28px,3.4vw,48px)" }}
                  >
                    {step.title}
                  </h3>
                  <p className="m-0 max-w-[42ch] text-black/70" style={{ fontSize: "clamp(17px,1.5vw,21px)", lineHeight: 1.5 }}>
                    {step.text}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
