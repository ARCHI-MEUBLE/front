import { useMemo } from 'react';
import { ShoppingCart, Truck, Shield, Award } from 'lucide-react';

interface PriceDisplayProps {
  price: number;
  onAddToCart: () => void;
  loading?: boolean;
  isAuthenticated?: boolean;
}

export default function PriceDisplay({
  price,
  onAddToCart,
  loading = false,
  isAuthenticated = false,
}: PriceDisplayProps) {
  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }, [price]);

  return (
    <div className="space-y-6">
      {/* Séparateur */}
      <div className="border-t border-[#E8E6E3]" />

      {/* Prix */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
            Prix estimé
          </span>
          <div className="mt-1 font-serif text-4xl text-[#1A1917]">
            {formattedPrice}
          </div>
          <p className="mt-1 text-xs text-[#706F6C]">
            Livraison et installation incluses
          </p>
        </div>
      </div>

      {/* Bouton principal */}
      <button
        type="button"
        onClick={onAddToCart}
        disabled={loading}
        className="flex h-14 w-full items-center justify-center gap-3 bg-[#1A1917] text-base font-medium text-white transition-colors hover:bg-[#2A2927] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ borderRadius: '2px' }}
      >
        {loading ? (
          <>
            <div className="h-5 w-5 animate-spin border-2 border-white border-t-transparent" style={{ borderRadius: '50%' }} />
            <span>Chargement...</span>
          </>
        ) : (
          <>
            <ShoppingCart className="h-5 w-5" />
            <span>Ajouter au panier</span>
          </>
        )}
      </button>

      {/* Infos utilisateur */}
      {!isAuthenticated && (
        <p className="text-center text-xs text-[#706F6C]">
          Connectez-vous pour sauvegarder votre configuration
        </p>
      )}

      {/* Garanties */}
      <div className="grid grid-cols-3 gap-3 border-t border-[#E8E6E3] pt-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center border border-[#E8E6E3]" style={{ borderRadius: '2px' }}>
            <Truck className="h-4 w-4 text-[#706F6C]" />
          </div>
          <span className="mt-2 text-xs text-[#706F6C]">Livraison offerte</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center border border-[#E8E6E3]" style={{ borderRadius: '2px' }}>
            <Shield className="h-4 w-4 text-[#706F6C]" />
          </div>
          <span className="mt-2 text-xs text-[#706F6C]">Garantie 10 ans</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center border border-[#E8E6E3]" style={{ borderRadius: '2px' }}>
            <Award className="h-4 w-4 text-[#706F6C]" />
          </div>
          <span className="mt-2 text-xs text-[#706F6C]">Made in France</span>
        </div>
      </div>
    </div>
  );
}
