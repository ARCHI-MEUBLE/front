import { Box } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { formatPriceRange, type PriceEstimate } from '@/lib/pricing';

interface PriceDisplayProps {
  estimate: PriceEstimate | null;
  onAddToCart: () => void;
  loading?: boolean;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  isAdminCreateModel?: boolean;
  isAdminEditModel?: boolean;
}

export default function PriceDisplay({
  estimate,
  onAddToCart,
  loading = false,
  isAuthenticated = false,
  isAdmin = false,
  isAdminCreateModel = false,
  isAdminEditModel = false,
}: PriceDisplayProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {/* Prix : fourchette prix ± écart type, calculée par le backend */}
      <div>
        <span className="eyebrow-lg text-black/65">
          Prix estimé
        </span>
        <div className="text-3xl font-medium tracking-[-0.03em] text-black">
          {estimate ? formatPriceRange(estimate) : '…'}
        </div>
        {estimate && (
          <p className="mt-0.5 text-xs text-black/65">
            Estimation centrale {formatPrice(estimate.price)} · écart type ± {formatPrice(estimate.sigma)}
          </p>
        )}
      </div>

      {/* Bouton principal */}
      {(!isAdminCreateModel && !isAdminEditModel) ? (
        <button
          type="button"
          onClick={onAddToCart}
          disabled={loading}
          className="flex h-12 items-center justify-center gap-2 bg-am-wine px-6 text-sm font-medium text-white transition-colors hover:bg-am-wine/90 disabled:cursor-not-allowed disabled:opacity-50"
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
          className="flex h-12 items-center justify-center gap-2 bg-am-navy px-6 text-sm font-medium text-white transition-colors hover:bg-am-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
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
