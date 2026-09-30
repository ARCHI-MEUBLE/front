import Image from "next/image";
import { HOME_SECTION } from "@/components/home/homeLayout";
import { PROCESS } from "@/components/home/homeData";

export function ProcessSection() {
  return (
    <section aria-labelledby="process-title" className={HOME_SECTION}>
      <h2
        id="process-title"
        className="mx-auto mb-14 max-w-[16ch] text-center font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-[#161513]"
        style={{ fontSize: "clamp(36px,5vw,72px)" }}
      >
        De la demande à la pose, un interlocuteur unique.
      </h2>
      <div className="relative mx-auto min-h-[340px] max-w-[880px]" style={{ aspectRatio: "16/9" }}>
        <div className="absolute bottom-[10%] left-[8%] right-[8%] top-0 rounded-3xl bg-[#3B3832]" />
        <div className="absolute bottom-[6%] left-[4%] right-[4%] top-[4%] rounded-3xl bg-[#5F5B53]" />
        <div className="absolute inset-x-0 bottom-0 top-[8%] overflow-hidden rounded-3xl border border-[#161513] bg-white shadow-[0_40px_80px_-40px_rgba(22,21,19,0.55)]">
          {PROCESS.map((step, index) => (
            <div
              key={step.title}
              className="home-fade-slide absolute inset-0 grid"
              style={{ gridTemplateColumns: "minmax(0,0.9fr) minmax(0,1.1fr)", animationDelay: `${index * -3600}ms` }}
            >
              <div className="relative overflow-hidden bg-[#EDEBE4]">
                <Image src={step.image} alt="" fill className="object-cover" unoptimized />
              </div>
              <div className="flex min-w-0 flex-col justify-between gap-5 p-[clamp(22px,3.4vw,48px)]">
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full border border-[#161513] bg-[#D4FF3A] px-3 py-1 font-[Geist_Mono] text-[13px] text-[#161513]">
                    {String(index + 1).padStart(2, "0")} / 05
                  </span>
                  <span className="font-[Geist_Mono] text-[13px] text-[#5F5B53]">{step.tag}</span>
                </div>
                <div>
                  <h3
                    className="m-0 mb-3.5 font-[Geist] font-medium leading-none tracking-[-0.045em] text-[#161513]"
                    style={{ fontSize: "clamp(28px,3.4vw,48px)" }}
                  >
                    {step.title}
                  </h3>
                  <p className="m-0 max-w-[42ch] text-[#5F5B53]" style={{ fontSize: "clamp(17px,1.5vw,21px)", lineHeight: 1.5 }}>
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
