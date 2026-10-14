import type { SampleColor } from "@/lib/apiClient";

export function SampleSwatch({
  color,
  isInCart,
  isLimitReached,
  isAdding,
  onToggle,
}: {
  color: SampleColor;
  isInCart: boolean;
  isLimitReached: boolean;
  isAdding: boolean;
  onToggle: () => void;
}) {
  const isDisabled = isInCart || isLimitReached || isAdding;

  return (
    <button
      type="button"
      aria-pressed={isInCart}
      disabled={isDisabled}
      onClick={onToggle}
      className="relative flex flex-col gap-3 rounded bg-white px-2.5 pb-3.5 pt-2.5 text-left text-black shadow-[0_0_0_1px_rgba(0,0,0,0.15)] disabled:cursor-not-allowed"
      style={{ opacity: isLimitReached && !isInCart ? 0.45 : 1 }}
    >
      <span
        className="block w-full rounded-sm shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
        style={{
          aspectRatio: "1/1.1",
          background: color.image_url ? `url(${color.image_url}) center/cover` : color.hex || "color-mix(in srgb, var(--am-mist) 30%, transparent)",
        }}
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-[14px] font-medium tracking-[-0.01em]">{color.name}</span>
      </span>
      <span
        aria-hidden="true"
        className="absolute right-4 top-4 flex h-[26px] w-[26px] items-center justify-center rounded-full border border-black bg-am-mist text-[13px]"
        style={{ opacity: isInCart ? 1 : 0 }}
      >
        ✓
      </span>
    </button>
  );
}
