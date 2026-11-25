import ZoneEditor, { Zone } from '@/components/configurator/ZoneEditor';
import { Button } from '@/components/ui/button';
import { IconEdit } from '@tabler/icons-react';
import { displayColorName, displayMaterialName } from '@/lib/displayNames';
import { formatPrice } from '@/lib/format';
import {
  currentEstimateIfDifferent,
  deliveryLabel,
  formatPriceRange,
  type PriceEstimate,
  type SavedQuote,
} from '@/lib/pricing';
import {
  DEFAULT_HANDLE_DEFAULTS,
  handleFacadeKind,
  resolveZoneHandle,
  summarizeHandles,
  type HandleDefaults,
  type HandleModel,
} from '@/lib/configurator/handles';

// Poignée propre à un compartiment ; celle du meuble est déjà dans la ligne « Poignées »
function ownHandleLabel(zone: Zone, models: HandleModel[], defaults: HandleDefaults): string | null {
  const kind = handleFacadeKind(zone);
  if (!kind || !resolveZoneHandle(zone, kind, models, defaults).customized) return null;
  return summarizeHandles(zone, models, defaults);
}

function analyzeConfiguration(zone: Zone, models: HandleModel[], defaults: HandleDefaults) {
  const leafZones: any[] = [];

  let leafCounter = 0;

  const traverse = (z: Zone) => {
    if (z.type === 'leaf') {
      leafCounter++;
      leafZones.push({
        number: leafCounter,
        id: z.id,
        content: z.content || 'empty',
        handle: ownHandleLabel(z, models, defaults),
        hasLight: z.hasLight,
        hasCableHole: z.hasCableHole,
        color: z.zoneColor?.hex
      });
    }

    if (z.children) z.children.forEach(traverse);
  };

  traverse(zone);

  return {
    // Portes de groupe comprises
    handles: summarizeHandles(zone, models, defaults),
    leafZones
  };
}

const EQUIPMENT_LABELS: Record<string, string> = {
  drawer: 'Tiroir',
  push_drawer: 'Tiroir Push-to-Open',
  dressing: 'Penderie',
  door: 'Porte Gauche',
  door_right: 'Porte Droite',
  door_double: 'Double Porte',
  mirror_door: 'Porte Vitrée',
  push_door: 'Porte Push-to-Open',
  niche: 'Niche',
  shelf: 'Étagère',
  light: 'Éclairage LED',
  cable_hole: 'Passe-câble',
};

// Prix de la fiche. Une configuration enregistrée montre son devis (le prix enregistré, celui qui sera payé), et
// l'estimation actuelle seulement si la grille de prix a changé depuis. Sans devis : l'estimation.
function QuotePrice({
  quote,
  estimate,
  error,
  isAdmin,
}: {
  quote: SavedQuote | null;
  estimate: PriceEstimate | null;
  error: string | null;
  isAdmin: boolean;
}) {
  const delivery = estimate ? deliveryLabel(estimate.delivery) : null;

  if (!quote) {
    return (
      <div className="py-4 border-t border-black/10">
        <div className="flex items-center justify-between">
          <span className="text-sm text-black/65">Estimation</span>
          <span className={`text-2xl font-medium tracking-[-0.03em] ${error ? 'text-am-wine' : ''}`}>
            {error ? 'Prix indisponible' : estimate ? formatPriceRange(estimate) : '…'}
          </span>
        </div>
        {error && <p className="mt-1 text-right text-xs text-am-wine">{error}</p>}
        {!error && delivery && <p className="mt-1 text-right text-xs text-black/65">{delivery}</p>}
      </div>
    );
  }

  const current = currentEstimateIfDifferent(quote, estimate);
  return (
    <div className="py-4 border-t border-black/10 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-black/65">Prix du devis</span>
        <span className="flex items-center gap-2">
          {quote.adjusted && (
            <span className="px-1.5 py-0.5 bg-am-wine/10 text-am-wine text-[10px] font-medium">Prix ajusté</span>
          )}
          <span className="text-2xl font-medium tracking-[-0.03em]">{formatPrice(quote.price)}</span>
        </span>
      </div>
      <p className="text-right text-xs text-black/65">
        {quote.includesDelivery ? 'Livraison comprise dans ce prix' : delivery ?? 'Livraison ajoutée au panier'}
      </p>
      {isAdmin && quote.note && <p className="text-right text-xs italic text-black/65">Note : {quote.note}</p>}
      {current !== null && (
        <p className="text-right text-xs text-black/65">
          Estimation actuelle de la grille : {formatPrice(current)}
          {quote.includesDelivery ? ' livraison comprise' : ''}
        </p>
      )}
    </div>
  );
}

export function ConfigurationSummary({
  width, height, depth, finish, color, socle, rootZone, priceEstimate, priceError = null, savedQuote = null, modelName,
  isAdmin, onEdit, mountingStyle, colorLabel, isOwner, onEditOwn,
  handleModels = [], handleDefaults = DEFAULT_HANDLE_DEFAULTS
}: any) {
  const analysis = analyzeConfiguration(rootZone, handleModels, handleDefaults);

  const equipmentCount: Record<string, number> = {};
  analysis.leafZones.forEach((z: any) => {
    const key = z.content || 'empty';
    equipmentCount[key] = (equipmentCount[key] || 0) + 1;
  });

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto custom-scrollbar">
      <div className="p-5 border-b border-black/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl text-black">Fiche technique</h2>
            <p className="text-xs text-black/65 mt-0.5">{modelName || 'Configuration client'}</p>
          </div>
          {isAdmin && onEdit && (
            <Button
              onClick={onEdit}
              size="sm"
              className="bg-am-navy text-white hover:bg-am-navy/90 h-8 px-4 text-xs"
            >
              <IconEdit className="h-3.5 w-3.5 mr-1.5" />
              Modifier
            </Button>
          )}
          {!isAdmin && isOwner && onEditOwn && (
            <Button
              onClick={onEditOwn}
              size="sm"
              className="bg-am-navy text-white hover:bg-am-navy/90 h-8 px-4 text-xs"
            >
              <IconEdit className="h-3.5 w-3.5 mr-1.5" />
              Modifier ma configuration
            </Button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="border border-black/10 p-3 bg-am-mist/15">
          <ZoneEditor
            rootZone={rootZone}
            selectedZoneIds={[]}
            onRootZoneChange={() => {}}
            onSelectedZoneIdsChange={() => {}}
            width={width}
            height={height}
            hideControls={true}
            showNumbers={true}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-black/10">
            <span className="text-black/65">Largeur</span>
            <span className="font-medium">{width} mm</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-black/10">
            <span className="text-black/65">Hauteur</span>
            <span className="font-medium">{height} mm</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-black/10">
            <span className="text-black/65">Profondeur</span>
            <span className="font-medium">{depth} mm</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-black/10">
            <span className="text-black/65">Montage</span>
            <span className="font-medium">{mountingStyle === 'encastre' ? 'Encastré' : 'En applique'}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-black/10">
            <span className="text-black/65">Matériau</span>
            <span className="font-medium">{displayMaterialName(finish)}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-black/10">
            <span className="text-black/65">Couleur</span>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 border border-black/10" style={{ backgroundColor: color }}></span>
              <span className="font-medium">{displayColorName(colorLabel) || color}</span>
            </div>
          </div>
          <div className="flex justify-between py-1.5 border-b border-black/10">
            <span className="text-black/65">Socle</span>
            <span className="font-medium">
              {socle === 'metal' ? 'Métal noir' : socle === 'wood' ? 'Plinthe bois' : 'Sans socle'}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-black/10">
            <span className="text-black/65">Poignées</span>
            <span className="font-medium">
              {analysis.handles ?? 'Aucune'}
            </span>
          </div>
        </div>

        <div>
          <h3 className="eyebrow-lg text-black/65 mb-2">Équipements ({analysis.leafZones.length} zones)</h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(equipmentCount).map(([key, count]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2 py-1 bg-am-mist/15 text-xs border border-black/10"
              >
                <span className="font-medium">{count}x</span>
                <span className="text-black/65">{EQUIPMENT_LABELS[key] || (key === 'empty' ? 'Vide' : key)}</span>
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="eyebrow-lg text-black/65 mb-2">Détail par zone</h3>
          <div className="border border-black/10 divide-y divide-black/10 text-sm">
            {analysis.leafZones.map((z: any) => (
              <div key={z.id} className="flex items-center gap-3 px-3 py-2 hover:bg-am-mist/30">
                <span className="flex items-center justify-center h-5 w-5 bg-am-navy text-white text-[10px] font-semibold">
                  {z.number}
                </span>
                <span className="flex-1 font-medium">
                  {EQUIPMENT_LABELS[z.content] || (z.content === 'empty' ? 'Vide' : z.content)}
                </span>
                <div className="flex items-center gap-2 text-xs text-black/65">
                  {z.hasLight && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-[10px]">LED</span>}
                  {z.hasCableHole && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px]">Câble</span>}
                  {z.color && (
                    <span className="h-3 w-3 border border-black/10" style={{ backgroundColor: z.color }}></span>
                  )}
                  {z.handle && <span className="italic">{z.handle}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <QuotePrice quote={savedQuote} estimate={priceEstimate} error={priceError} isAdmin={isAdmin} />

        <p className="text-xs text-black/65 text-center py-3 border-t border-black/10">
          Mode consultation — Cliquez sur Modifier pour éditer
        </p>
      </div>
    </div>
  );
}
