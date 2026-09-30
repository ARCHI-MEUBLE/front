import { HOME_SECTION } from "@/components/home/homeLayout";
import { CITIES } from "@/components/home/homeData";

export function ServiceAreaSection() {
  return (
    <section aria-labelledby="zone-title" className={HOME_SECTION}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <h2
            id="zone-title"
            className="m-0 mb-5 max-w-[12ch] font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-[#161513]"
            style={{ fontSize: "clamp(36px,5vw,72px)" }}
          >
            Lille et la métropole lilloise.
          </h2>
          <p className="m-0 max-w-[44ch] text-[18px] text-[#3B3832]">
            Et dans le cas où vous vous situez dans une ville qui n&apos;est pas listée ici, il est possible que
            nous nous déplacions tout de même.
          </p>
        </div>
        <div className="flex flex-wrap content-start gap-2">
          {CITIES.map((city, index) => (
            <span
              key={city}
              className="rounded-full px-[18px] py-2.5 tracking-[-0.01em]"
              style={{
                fontSize: "clamp(16px,1.4vw,19px)",
                border: `1px solid ${index === 0 ? "#161513" : "#E5E2D9"}`,
                background: index === 0 ? "#D4FF3A" : "#FFFFFF",
              }}
            >
              {city}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
