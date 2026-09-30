import { HOME_SECTION } from "@/components/home/homeLayout";
import { REASONS } from "@/components/home/homeData";

export function WhyChooseUs() {
  return (
    <section aria-labelledby="why-title" className={HOME_SECTION}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <h2
            id="why-title"
            className="m-0 mb-5 max-w-[10ch] font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-[#161513]"
            style={{ fontSize: "clamp(36px,5vw,72px)" }}
          >
            La précision du sur-mesure.
          </h2>
          <p className="m-0 max-w-[40ch] text-[18px] text-[#3B3832]">
            Du premier croquis à l&apos;installation, chaque détail est pensé pour créer un meuble qui traverse les
            années.
          </p>
        </div>
        <div className="border-t border-[#161513]">
          {REASONS.map((reason, index) => (
            <div key={reason.title} className="grid gap-4 border-b border-[#E5E2D9] py-7" style={{ gridTemplateColumns: "48px minmax(0,1fr)" }}>
              <span className="pt-1.5 font-[Geist_Mono] text-[13px] text-[#5F5B53]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="m-0 mb-2 font-[Geist] font-medium tracking-[-0.035em] text-[#161513]" style={{ fontSize: "clamp(24px,2.4vw,32px)" }}>
                  {reason.title}
                </h3>
                <p className="m-0 max-w-[52ch] text-[#5F5B53]">{reason.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
