import { HOME_MONO } from "@/components/home/homeLayout";
import { CatalogueItemDetail } from "@/lib/catalogueItem";
import { formatPrice } from "@/lib/format";

export function ProductInfo({
  item,
  quantity,
  onQuantityChange,
  selectedVariationIdx,
  onSelectVariation,
  adding,
  addedToCart,
  onAddToCart,
  onGoToCart,
}: {
  item: CatalogueItemDetail;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  selectedVariationIdx: number;
  onSelectVariation: (index: number) => void;
  adding: boolean;
  addedToCart: boolean;
  onAddToCart: () => void;
  onGoToCart: () => void;
}) {
  const minQuantity = item.min_order_quantity || 1;
  const total = Number(item.unit_price) * quantity;
  const variations = item.variations || [];

  return (
    <div className="flex flex-col gap-7 lg:sticky lg:top-24">
      <div className="flex flex-col gap-3">
        <span className={HOME_MONO}>{item.category}</span>
        <h1 className="m-0 text-title text-black">
          {item.name}
        </h1>
        <span className="text-[28px] font-medium tracking-[-0.03em] text-black">
          {formatPrice(Number(item.unit_price))}
        </span>
      </div>

      <p className="m-0 max-w-[46ch] text-[18px] text-black/85">
        {item.description || "Aucune description disponible pour ce produit."}
      </p>

      {variations.length > 0 && (
        <div className="flex flex-col gap-3">
          <label className={HOME_MONO}>{item.variation_label || "Couleur / Finition"}</label>
          <div className="flex flex-wrap gap-2">
            {variations.map((variation, index) => (
              <button
                key={variation.id ?? index}
                type="button"
                onClick={() => onSelectVariation(index)}
                className={`rounded-full border px-4 py-2 text-[14px] font-medium ${
                  index === selectedVariationIdx
                    ? "border-black bg-am-navy text-white"
                    : "border-black/15 bg-white text-black"
                }`}
              >
                {variation.color_name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Quantité"
          className="flex h-[52px] items-center rounded-full border border-black/30 bg-white"
        >
          <button
            type="button"
            aria-label="Retirer un"
            onClick={() => onQuantityChange(Math.max(minQuantity, quantity - 1))}
            className="flex h-[50px] w-12 items-center justify-center text-[20px] text-black"
          >
            −
          </button>
          <span aria-live="polite" className="min-w-7 text-center font-mono text-[15px]">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Ajouter un"
            onClick={() => onQuantityChange(quantity + 1)}
            className="flex h-[50px] w-12 items-center justify-center text-[20px] text-black"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={onAddToCart}
          disabled={adding}
          className="min-h-[52px] min-w-[220px] flex-1 rounded-full border border-black bg-am-wine px-6 py-3.5 text-[15px] font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60"
        >
          {adding ? "Ajout en cours..." : `Ajouter au panier · ${formatPrice(total)}`}
        </button>
      </div>

      {minQuantity > 1 && (
        <p className="m-0 -mt-4 text-[13px] italic text-black/70">
          Minimum de commande : {minQuantity} {item.unit}s
        </p>
      )}

      {addedToCart && (
        <button
          type="button"
          onClick={onGoToCart}
          className="min-h-[52px] rounded-full border border-black bg-am-navy px-6 py-3.5 text-[15px] font-medium text-white"
        >
          Aller au panier →
        </button>
      )}

      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] border-t border-black/15">
        <dt className={`border-b border-black/15 py-3.5 pr-6 ${HOME_MONO}`}>Matière</dt>
        <dd className="m-0 border-b border-black/15 py-3.5 text-[15px] text-black">
          {item.material || "Non spécifié"}
        </dd>
        <dt className={`border-b border-black/15 py-3.5 pr-6 ${HOME_MONO}`}>Dimensions</dt>
        <dd className="m-0 border-b border-black/15 py-3.5 text-[15px] text-black">
          {item.dimensions || "Standard"}
        </dd>
        <dt className={`border-b border-black/15 py-3.5 pr-6 ${HOME_MONO}`}>Livraison</dt>
        <dd className="m-0 border-b border-black/15 py-3.5 text-[15px] text-black">3 à 5 jours ouvrés</dd>
      </dl>
    </div>
  );
}
