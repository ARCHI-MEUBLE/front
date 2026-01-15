import { useMemo } from 'react';
import { Box } from 'lucide-react';

interface PriceDisplayProps {
  price: number;
  onAddToCart: () => void;
  loading?: boolean;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  isAdminCreateModel?: boolean;
  isAdminEditModel?: boolean;
  displayMode?: number;
  deviationRange?: number;
}

export default function PriceDisplay({
  price,
  onAddToCart,
  loading = false,
  isAuthenticated = false,
  isAdmin = false,
  isAdminCreateModel = false,
  isAdminEditModel = false,
  displayMode = 0,
  deviationRange = 0,
}: PriceDisplayProps) {
  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(p);
  };

  const priceContent = useMemo(() => {
    if (displayMode === 1 && deviationRange > 0) {
      const minPrice = Math.max(0, price - deviationRange);
      const maxPrice = price + deviationRange;
      return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
    }
    return formatPrice(price);
  }, [price, displayMode, deviationRange]);

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Prix */}
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
          Prix estimé
        </span>
        <div className="font-serif text-3xl text-[#1A1917]">
          {priceContent}
        </div>
      </div>

      {/* Bouton principal */}
      {(!isAdminCreateModel && !isAdminEditModel) ? (
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
              <span>
                {isAdmin ? 'Terminer' : (isAuthenticated ? 'Valider avec un menuisier' : 'Enregistrer mon projet')}
              </span>
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={onAddToCart}
          disabled={loading}
          className="flex h-12 items-center justify-center gap-2 bg-[#8B7355] px-6 text-sm font-medium text-white transition-colors hover:bg-[#705D45] disabled:cursor-not-allowed disabled:opacity-50"
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
              <span>
                {isAdminEditModel ? 'Mettre à jour le modèle' : 'Enregistrer le modèle'}
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
