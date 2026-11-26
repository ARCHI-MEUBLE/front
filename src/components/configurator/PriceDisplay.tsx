import { Box } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { deliveryLabel, formatPriceRange, type PriceEstimate, type SavedQuote } from '@/lib/pricing';

interface PriceDisplayProps {
  estimate: PriceEstimate | null;
  // Message du backend quand le prix ne peut pas être calculé : « Prix indisponible », jamais un ancien prix
  error?: string | null;
  // Devis de la configuration en cours de modification : un nouvel enregistrement le remplace par le calcul affiché
  savedQuote?: SavedQuote | null;
  onAddToCart: () => void;
  loading?: boolean;
  isAdmin?: boolean;
  isAdminCreateModel?: boolean;
  isAdminEditModel?: boolean;
}

export default function PriceDisplay({
  estimate,
  error = null,
  savedQuote = null,
  onAddToCart,
  loading = false,
  isAdmin = false,
  isAdminCreateModel = false,
  isAdminEditModel = false,
}: PriceDisplayProps) {
  const delivery = estimate ? deliveryLabel(estimate.delivery) : null;

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Prix du meuble : fourchette prix ± écart type, calculée par le backend ; la livraison s'ajoute au panier */}
      <div className="min-w-0">
        <span className="eyebrow-lg text-black/65">
          Prix estimé
        </span>
        {error ? (
          <>
            <div className="text-2xl font-medium tracking-[-0.03em] text-am-wine">Prix indisponible</div>
            <p className="mt-0.5 text-xs text-am-wine" role="alert">{error}</p>
          </>
        ) : (
          <>
            <div className="text-3xl font-medium tracking-[-0.03em] text-black">
              {estimate ? formatPriceRange(estimate) : '…'}
            </div>
            {estimate && (
              <p className="mt-0.5 text-xs text-black/65">
                Estimation centrale {formatPrice(estimate.price)} · écart type ± {formatPrice(estimate.sigma)}
              </p>
            )}
            {delivery && <p className="mt-0.5 text-xs text-black/65">{delivery}</p>}
          </>
        )}
        {savedQuote?.adjusted && (
          <p className="mt-1 text-xs text-am-wine">
            Prix ajusté par l&apos;atelier : {formatPrice(savedQuote.price)}. Enregistrer vos modifications le remplace par ce
            nouveau calcul.
          </p>
        )}
      </div>

      {/* Bouton principal */}
      {(!isAdminCreateModel && !isAdminEditModel) ? (
        <button
          type="button"
          onClick={onAddToCart}
          disabled={loading}
          className="flex h-12 flex-shrink-0 items-center justify-center gap-2 bg-am-wine px-6 text-sm font-medium text-white transition-colors hover:bg-am-wine/90 disabled:cursor-not-allowed disabled:opacity-50"
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
                {isAdmin ? 'Terminer' : 'Valider avec un menuisier'}
              </span>
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={onAddToCart}
          disabled={loading}
          className="flex h-12 flex-shrink-0 items-center justify-center gap-2 bg-am-navy px-6 text-sm font-medium text-white transition-colors hover:bg-am-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
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
