import Link from "next/link";
import { HOME_MONO } from "@/components/home/homeLayout";
import type { SampleColor } from "@/lib/apiClient";

const KIT_SIZE = 5;

export function SamplesKitSidebar({
  selectedMaterial,
  kitItems,
}: {
  selectedMaterial: string | null;
  kitItems: SampleColor[];
}) {
  const slots = Array.from({ length: KIT_SIZE }, (_, i) => kitItems[i] ?? null);
  const isEmpty = kitItems.length === 0;

  return (
    <aside
      aria-label="Votre kit"
      className="sticky flex flex-col gap-6 rounded-md bg-white p-7 shadow-[0_0_0_1px_rgba(22,21,19,0.06),0_16px_40px_-12px_rgba(22,21,19,0.22)]"
      style={{ top: 96 }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="m-0 text-[24px] font-medium tracking-[-0.04em]">Votre kit</h3>
        <span className={`text-[11px] ${HOME_MONO}`}>
          {kitItems.length} / {KIT_SIZE}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {slots.map((item, i) =>
          item ? (
            <span
              key={item.id}
              className="rounded-[3px]"
              style={{ aspectRatio: "3/4", background: item.image_url ? `url(${item.image_url}) center/cover` : item.hex || "#ECE9E1" }}
            />
          ) : (
            <span key={i} className="rounded-[3px] border border-dashed border-[#CFCBC0] bg-[#F7F6F2]" style={{ aspectRatio: "3/4" }} />
          )
        )}
      </div>

      {isEmpty ? (
        <p className="m-0 text-[15px] text-[#5F5B53]">Touchez une teinte pour l&apos;ajouter à votre kit.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[14px] text-[#5F5B53]">
          {kitItems.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}

      <div className="flex justify-between gap-3 border-t border-[#EDEBE4] pt-4 text-[15px]">
        <span className="text-[#5F5B53]">Matériau</span>
        <span className="font-medium">{selectedMaterial || "—"}</span>
      </div>

      {isEmpty ? (
        <button
          type="button"
          disabled
          className="min-h-[52px] cursor-not-allowed rounded-full border border-[#161513] bg-[#D4FF3A] px-6 py-4 text-[15px] font-medium text-[#161513] opacity-50"
        >
          Commander mes échantillons
        </button>
      ) : (
        <Link
          href="/cart"
          className="flex min-h-[52px] items-center justify-center rounded-full border border-[#161513] bg-[#D4FF3A] px-6 py-4 text-[15px] font-medium text-[#161513]"
        >
          Commander mes échantillons
        </Link>
      )}
    </aside>
  );
}
