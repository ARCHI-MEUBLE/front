import { SyntheticEvent, KeyboardEvent } from 'react';
import { Zone, ZoneContent, ZONE_CONTENT_META } from './types';

interface ZoneNodeProps {
  zone: Zone;
  selectedZoneId: string;
  onSelect: (zoneId: string) => void;
  depth?: number;
}

function ZoneNode({ zone, selectedZoneId, onSelect, depth = 0 }: ZoneNodeProps) {
  const isSelected = zone.id === selectedZoneId;

  const handleClick = (event: SyntheticEvent) => {
    event.stopPropagation();
    onSelect(zone.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement | HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(zone.id);
    }
  };

  if (zone.type === 'leaf') {
    const meta = ZONE_CONTENT_META[zone.content ?? 'empty'];
    return (
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`flex h-full w-full items-center justify-center border text-xs font-mono font-medium transition-all duration-200 ${
          isSelected
            ? 'border-[#8B7355] bg-[#8B7355]/5 text-[#8B7355]'
            : 'border-[#E8E6E3] bg-white text-[#706F6C] hover:border-[#1A1917] hover:text-[#1A1917]'
        }`}
        style={{ borderRadius: '2px' }}
      >
        {meta.shortLabel}
      </button>
    );
  }

  const isHorizontal = zone.type === 'horizontal';
  const children = zone.children ?? [];
  const rawWeights = children.length === 2 && zone.splitRatio !== undefined
    ? [Math.max(1, zone.splitRatio), Math.max(1, 100 - zone.splitRatio)]
    : children.map(() => 1);

  // Inverser l'ordre pour les divisions horizontales (bas -> haut)
  const orderedChildren = isHorizontal ? [...children].reverse() : children;
  const orderedWeights = isHorizontal ? [...rawWeights].reverse() : rawWeights;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`flex h-full w-full gap-1 border p-1 transition-all duration-200 ${
        isSelected
          ? 'border-[#8B7355] bg-[#8B7355]/5'
          : 'border-[#E8E6E3] bg-[#FAFAF9] hover:border-[#1A1917]'
      }`}
      style={{
        flexDirection: isHorizontal ? 'column' : 'row',
        borderRadius: '2px',
      }}
    >
      {orderedChildren.map((child, index) => (
        <div
          key={child.id}
          className="flex"
          style={{ flexGrow: orderedWeights[index] ?? 1, flexBasis: 0 }}
        >
          <ZoneNode
            zone={child}
            selectedZoneId={selectedZoneId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        </div>
      ))}
    </div>
  );
}

interface ZoneCanvasProps {
  zone: Zone;
  selectedZoneId: string;
  onSelect: (zoneId: string) => void;
  height?: number;
}

export default function ZoneCanvas({
  zone,
  selectedZoneId,
  onSelect,
  height = 240,
}: ZoneCanvasProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
          Plan du meuble
        </span>
        <span className="text-xs text-[#706F6C]">
          Cliquez pour sélectionner
        </span>
      </div>

      <div
        className="w-full border border-[#E8E6E3] bg-[#FAFAF9] p-3"
        style={{ borderRadius: '2px' }}
      >
        <div className="w-full" style={{ height }}>
          <ZoneNode
            zone={zone}
            selectedZoneId={selectedZoneId}
            onSelect={onSelect}
          />
        </div>
      </div>
    </div>
  );
}
