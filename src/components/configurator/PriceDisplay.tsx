import { useMemo } from 'react';
import { Box } from 'lucide-react';

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
    <div className="flex items-center justify-between gap-4">
      {/* Prix */}
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
          Prix estimé
        </span>
        <div className="font-serif text-3xl text-[#1A1917]">
          {formattedPrice}
        </div>
      </div>

      {/* Bouton principal */}
      <button
        type="button"
        onClick={onAddToCart}
        disabled={loading}
        className="flex h-12 items-center justify-center gap-2 bg-[#1A1917] px-6 text-sm font-medium text-white transition-colors hover:bg-[#2A2927] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ borderRadius: '2px' }}
      >
        {loading ? (
          <>
            <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent" style={{ borderRadius: '50%' }} />
            <span>Chargement...</span>
          </>
        ) : (
          <>
            <Box className="h-4 w-4" />
            <span>Terminer</span>
          </>
        )}
      </button>
    </div>
  );
}
