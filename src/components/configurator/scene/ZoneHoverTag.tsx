import { useMemo } from 'react';
import { ScreenHtml } from './ScreenHtml';
import type { Zone } from '@/components/configurator/ZoneEditor/types';
import { describeZone, getZoneBox, type FurnitureLayout } from '@/lib/configurator/zoneBounds';

interface ZoneHoverTagProps {
  rootZone: Zone;
  zoneId: string;
  layout: FurnitureLayout;
  // Dimensions extérieures du meuble en mm (pour la taille affichée de la zone)
  widthMm: number;
  heightMm: number;
  // En mode consultation un simple clic ouvre ou ferme ; sinon c'est un double-clic
  clickToOpen: boolean;
}

// Infobulle au-dessus de la zone survolée : de quoi s'agit-il, quelle taille, et comment l'ouvrir
export function ZoneHoverTag({ rootZone, zoneId, layout, widthMm, heightMm, clickToOpen }: ZoneHoverTagProps) {
  const description = useMemo(() => describeZone(rootZone, zoneId, widthMm, heightMm), [rootZone, zoneId, widthMm, heightMm]);
  const box = useMemo(() => getZoneBox(rootZone, zoneId, layout), [rootZone, zoneId, layout]);
  if (!description || !box) return null;

  return (
    <ScreenHtml
      position={[box.center[0], box.center[1] + box.size[1] / 2, layout.depth / 2]}
      // Sous les boutons de la page (z-20) mais au-dessus de la scène
      zIndexRange={[10, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        role="tooltip"
        className="whitespace-nowrap rounded-sm bg-am-navy/90 px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-lg"
        style={{ transform: 'translate(-50%, calc(-100% - 10px))' }}
      >
        <div className="font-semibold">{description.title}</div>
        <div className="text-white/70">{description.detail}</div>
        {description.openable && (
          <div className="mt-0.5 text-[10px] text-am-mist">{clickToOpen ? 'Clic' : 'Double-clic'} : ouvrir / fermer</div>
        )}
      </div>
    </ScreenHtml>
  );
}
