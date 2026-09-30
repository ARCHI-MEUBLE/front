import { HOME_SECTION, HOME_HEADING } from "@/components/home/homeLayout";

const cities = [
  "Lille",
  "Roubaix",
  "Tourcoing",
  "Villeneuve-d'Ascq",
  "Marcq-en-Barœul",
  "Wasquehal",
  "Mons-en-Barœul",
  "Lambersart",
  "La Madeleine",
  "Croix",
  "Wattignies"
];

export function ServiceAreaSection() {
  return (
    <section aria-labelledby="zone-title" className={HOME_SECTION}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <h2 id="zone-title" className={`${HOME_HEADING} m-0 mb-5 max-w-[12ch] text-[36px] sm:text-[52px] lg:text-[72px]`}>
            Lille et la métropole lilloise.
          </h2>
          <p className="m-0 max-w-[44ch] text-[18px] text-[#3B3832]">
            Et dans le cas où vous vous situez dans une ville qui n&apos;est pas listée ici, il est possible que nous
            nous déplacions tout de même.
          </p>
        </div>
        <div className="flex flex-wrap content-start gap-2">
          {cities.map((city) => (
            <span
              key={city}
              className={`rounded-full border px-[18px] py-[10px] text-[16px] tracking-[-0.01em] sm:text-[19px] ${
                city === "Lille"
                  ? "border-[#161513] bg-[#161513] text-[#F7F6F2]"
                  : "border-[#E5E2D9] bg-white text-[#161513]"
              }`}
            >
              {city}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
