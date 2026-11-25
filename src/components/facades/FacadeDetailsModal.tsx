import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { displayColorName } from '@/lib/displayNames';
import { formatPrice } from '@/lib/format';
import { NO_HINGE, useFacadeSettings } from '@/components/facades/facadePricing';

const FacadeCartPreview = dynamic(() => import('@/components/facades/FacadeCartPreview'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-am-mist/15 animate-pulse" />,
});

interface FacadeDetailsDrilling {
  id: string;
  type: string;
  typeName: string;
  x: number;
  y: number;
  diameter: number;
  price: number;
}

// Façade du panier ou du checkout (config enregistrée à l'ajout, prix unitaire calculé par le serveur)
export interface FacadeDetailsItem {
  config: {
    width: number;
    height: number;
    depth?: number;
    material?: { name?: string; color_hex?: string; texture_url?: string | null } | string;
    // Anciennes façades : matière et charnières à plat
    materialName?: string;
    hingeType?: string;
    hingeSide?: string;
    hingeCount?: number;
    hinges?: { type?: string; count?: number; direction?: string };
    drillings?: FacadeDetailsDrilling[];
  };
  quantity: number;
  unit_price: number | string;
}

const HINGE_LABELS: Record<string, string> = {
  [NO_HINGE]: 'Sans trou, sans charnière',
  'hole-with-applied-hinge': 'Trou + charnière fournie porte en applique',
  'hole-with-twin-hinge': 'Trou + charnière fournie porte jumelée',
  'hole-with-integrated-hinge': 'Trou + charnière fournie porte encastrée',
};

function HingeIcon({ type }: { type: string }) {
  switch (type) {
    case 'hole-with-applied-hinge':
      return (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <rect x="6" y="8" width="16" height="48" fill="#9CA3AF" stroke="#1A1917" strokeWidth="1.5"/>
          <rect x="20" y="12" width="28" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
          <rect x="18" y="20" width="8" height="12" fill="#4B5563" stroke="#1A1917" strokeWidth="1" rx="1"/>
          <rect x="14" y="22" width="6" height="8" fill="#6B7280" stroke="#1A1917" strokeWidth="1" rx="1"/>
          <circle cx="22" cy="24" r="1.5" fill="#374151"/>
          <circle cx="22" cy="29" r="1.5" fill="#374151"/>
          <circle cx="17" cy="26" r="1.5" fill="#374151"/>
          <circle cx="40" cy="32" r="2.5" fill="#6B7280" stroke="#1A1917" strokeWidth="1"/>
        </svg>
      );
    case 'hole-with-twin-hinge':
      return (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <rect x="28" y="8" width="8" height="48" fill="#9CA3AF" stroke="#1A1917" strokeWidth="1.5"/>
          <rect x="6" y="12" width="22" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
          <rect x="36" y="12" width="22" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
          <rect x="26" y="20" width="6" height="10" fill="#4B5563" stroke="#1A1917" strokeWidth="1" rx="1"/>
          <rect x="22" y="22" width="5" height="6" fill="#6B7280" stroke="#1A1917" strokeWidth="1" rx="1"/>
          <rect x="32" y="20" width="6" height="10" fill="#4B5563" stroke="#1A1917" strokeWidth="1" rx="1"/>
          <rect x="37" y="22" width="5" height="6" fill="#6B7280" stroke="#1A1917" strokeWidth="1" rx="1"/>
          <circle cx="29" cy="24" r="1.2" fill="#374151"/>
          <circle cx="35" cy="24" r="1.2" fill="#374151"/>
          <circle cx="20" cy="32" r="2" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8"/>
          <circle cx="44" cy="32" r="2" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8"/>
        </svg>
      );
    case 'hole-with-integrated-hinge':
      return (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <rect x="6" y="8" width="20" height="48" fill="#9CA3AF" stroke="#1A1917" strokeWidth="1.5"/>
          <rect x="24" y="12" width="4" height="40" fill="#6B7280" stroke="#1A1917" strokeWidth="1"/>
          <rect x="26" y="12" width="28" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
          <circle cx="29" cy="22" r="3" fill="#4B5563" stroke="#1A1917" strokeWidth="1.5"/>
          <circle cx="29" cy="32" r="3" fill="#4B5563" stroke="#1A1917" strokeWidth="1.5"/>
          <circle cx="29" cy="42" r="3" fill="#4B5563" stroke="#1A1917" strokeWidth="1.5"/>
          <rect x="27" y="20" width="8" height="4" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8" rx="0.5"/>
          <rect x="27" y="30" width="8" height="4" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8" rx="0.5"/>
          <rect x="27" y="40" width="8" height="4" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8" rx="0.5"/>
          <circle cx="45" cy="32" r="2.5" fill="#6B7280" stroke="#1A1917" strokeWidth="1"/>
        </svg>
      );
    default:
      return (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <rect x="16" y="8" width="32" height="48" fill="#D1D5DB" stroke="#1A1917" strokeWidth="2" rx="2"/>
          <circle cx="40" cy="32" r="2" fill="#6B7280"/>
          <line x1="12" y1="12" x2="52" y2="52" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"/>
          <line x1="52" y1="12" x2="12" y2="52" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      );
  }
}

// Détail d'une façade du panier ou du checkout. Le prix unitaire est celui calculé par le serveur à l'ajout ; le prix
// d'une charnière vient des réglages de l'admin (rien n'est affiché s'ils manquent, plutôt qu'un prix faux).
export default function FacadeDetailsModal({ facade, onClose }: { facade: FacadeDetailsItem; onClose: () => void }) {
  const { settings } = useFacadeSettings();
  const { config } = facade;
  const materialObj = typeof config.material === 'object' ? config.material : null;
  const materialName =
    displayColorName(materialObj?.name || config.materialName || (typeof config.material === 'string' ? config.material : '')) || 'Matériau';
  const hingeType = config.hinges?.type || config.hingeType || NO_HINGE;
  const hingeCount = config.hinges?.count || config.hingeCount || 0;
  const hingeSide = config.hinges?.direction || config.hingeSide || '';
  const withHinges = hingeType !== NO_HINGE;
  const drillings = config.drillings || [];
  const depth = config.depth || 19;
  const unitPrice = Number(facade.unit_price) || 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-black/10 bg-white p-6">
          <h3 className="text-xl text-black">Détails de la façade</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 items-center justify-center text-black/65 transition-colors hover:bg-am-mist/30 hover:text-black"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            <div className="aspect-square w-full max-w-[200px] mx-auto border border-black/10 overflow-hidden bg-am-mist/15">
              <FacadeCartPreview
                width={config.width}
                height={config.height}
                depth={depth}
                colorHex={materialObj?.color_hex || '#CCCCCC'}
                textureUrl={materialObj?.texture_url}
                drillings={drillings}
              />
            </div>

            <div className="grid gap-4">
              <div className="flex justify-between items-center py-3 border-b border-black/10">
                <span className="text-sm text-black/65">Dimensions</span>
                <span className="text-sm font-medium text-black">
                  {config.width / 10} × {config.height / 10} cm · {depth} mm
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-black/10">
                <span className="text-sm text-black/65">Matériau</span>
                <div className="flex items-center gap-2">
                  {materialObj?.texture_url ? (
                    <div className="h-5 w-5 border border-black/10 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={materialObj.texture_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : materialObj?.color_hex ? (
                    <div className="h-5 w-5 border border-black/10" style={{ backgroundColor: materialObj.color_hex }} />
                  ) : null}
                  <span className="text-sm font-medium text-black">{materialName}</span>
                </div>
              </div>

              <div className="py-3 border-b border-black/10">
                <span className="text-sm text-black/65 block mb-3">Charnières</span>
                <div className="flex items-center gap-3 p-3 bg-am-mist/15 rounded-lg">
                  <div className="flex-shrink-0">
                    <HingeIcon type={hingeType} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">{HINGE_LABELS[hingeType] ?? HINGE_LABELS[NO_HINGE]}</p>
                    {withHinges && hingeCount > 0 && (
                      <p className="text-xs text-black/65 mt-1">
                        {hingeCount} charnières · Ouverture {hingeSide === 'left' ? 'gauche' : hingeSide === 'right' ? 'droite' : hingeSide}
                      </p>
                    )}
                    {withHinges && settings.hingeBasePrice !== null && (
                      <p className="text-xs text-am-navy mt-1">Prix unit. {formatPrice(settings.hingeBasePrice)} TTC</p>
                    )}
                  </div>
                </div>
              </div>

              {drillings.length > 0 && (
                <div className="py-3 border-b border-black/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-black/65">Perçages</span>
                    <span className="text-sm font-medium text-black">{drillings.length} trou{drillings.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-1 pl-4">
                    {drillings.map((drill, idx) => (
                      <div key={drill.id} className="flex justify-between text-xs">
                        <span className="text-black/65">
                          {drill.typeName || `Trou ${idx + 1}`} ({drill.diameter}mm) - Position: {drill.x}×{drill.y} cm
                        </span>
                        {Number(drill.price) > 0 && <span className="text-black">+{formatPrice(drill.price)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center py-3 border-b border-black/10">
                <span className="text-sm text-black/65">Quantité</span>
                <span className="text-sm font-medium text-black">{facade.quantity}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-black/10">
                <span className="text-sm text-black/65">Prix unitaire</span>
                <span className="text-sm font-medium text-black">{formatPrice(unitPrice)}</span>
              </div>

              <div className="flex justify-between items-center py-3 bg-am-mist/15 px-4 -mx-4">
                <span className="text-sm font-medium text-black">Total</span>
                <span className="text-lg font-medium text-black">{formatPrice(unitPrice * facade.quantity)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-black/10 bg-white p-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 bg-am-navy text-white text-sm font-medium transition-colors hover:bg-am-navy/90"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
