import { useState, useRef, useCallback, useEffect, SyntheticEvent, KeyboardEvent, MouseEvent } from 'react';
import { Zone, ZoneContent, ZONE_CONTENT_META } from './types';

interface ZoneNodeProps {
  zone: Zone;
  selectedZoneId: string;
  onSelect: (zoneId: string) => void;
  onRatioChange?: (zoneId: string, ratios: number[]) => void;
  depth?: number;
  // Dimensions réelles en mm
  realWidth: number;
  realHeight: number;
}

function ZoneNode({
  zone,
  selectedZoneId,
  onSelect,
  onRatioChange,
  depth = 0,
  realWidth,
  realHeight,
}: ZoneNodeProps) {
  const isSelected = zone.id === selectedZoneId;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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

  // Calcul des ratios pour les enfants
  const getChildRatios = useCallback((): number[] => {
    const children = zone.children ?? [];
    if (children.length === 0) return [];
    if (children.length === 2 && zone.splitRatio !== undefined) {
      return [zone.splitRatio, 100 - zone.splitRatio];
    }
    // Pour 3+ enfants, utiliser les ratios stockés ou distribuer également
    if (children.length > 2 && zone.splitRatios?.length === children.length) {
      return zone.splitRatios;
    }
    return children.map(() => 100 / children.length);
  }, [zone]);

  // Gestion du drag pour ajuster les ratios
  const handleDragStart = (index: number) => (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragIndex(index);
  };

  const handleDragMove = useCallback((e: globalThis.MouseEvent) => {
    if (!isDragging || dragIndex === null || !containerRef.current || !onRatioChange) return;

    const rect = containerRef.current.getBoundingClientRect();
    const isHorizontal = zone.type === 'horizontal';
    const children = zone.children ?? [];
    const currentRatios = getChildRatios();

    // Position relative dans le conteneur (0 à 1)
    const rawPos = isHorizontal
      ? (rect.bottom - e.clientY) / rect.height
      : (e.clientX - rect.left) / rect.width;

    // Calculer la position cumulée jusqu'au séparateur drag
    // Pour l'index i, le séparateur est entre l'enfant i et i+1
    // On ajuste les ratios des enfants 0..i et i+1..n
    const orderedRatios = isHorizontal ? [...currentRatios].reverse() : currentRatios;

    // Position cumulée avant ce séparateur
    let cumBefore = 0;
    for (let i = 0; i <= dragIndex; i++) {
      cumBefore += orderedRatios[i];
    }

    // Nouvelle position cumulée
    const newCumBefore = Math.max(10, Math.min(90, rawPos * 100));
    const delta = newCumBefore - cumBefore;

    // Redistribuer le delta entre l'enfant actuel et le suivant
    const newRatios = [...orderedRatios];
    const minRatio = 10; // Ratio minimum par enfant

    // Ajuster l'enfant courant et le suivant
    const newCurrentRatio = Math.max(minRatio, newRatios[dragIndex] + delta);
    const newNextRatio = Math.max(minRatio, newRatios[dragIndex + 1] - delta);

    // Vérifier les limites
    if (newCurrentRatio >= minRatio && newNextRatio >= minRatio) {
      newRatios[dragIndex] = newCurrentRatio;
      newRatios[dragIndex + 1] = newNextRatio;

      // Remettre dans l'ordre original si horizontal
      const finalRatios = isHorizontal ? [...newRatios].reverse() : newRatios;
      onRatioChange(zone.id, finalRatios.map(r => Math.round(r)));
    }
  }, [isDragging, dragIndex, zone, onRatioChange, getChildRatios]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragIndex(null);
  }, []);

  // Attacher les event listeners pour le drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  if (zone.type === 'leaf') {
    const meta = ZONE_CONTENT_META[zone.content ?? 'empty'];
    return (
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`relative flex h-full w-full flex-col items-center justify-center border transition-all duration-200 ${
          isSelected
            ? 'border-[#8B7355] bg-[#8B7355]/5 text-[#8B7355]'
            : 'border-[#E8E6E3] bg-white text-[#706F6C] hover:border-[#1A1917] hover:text-[#1A1917]'
        }`}
        style={{ borderRadius: '2px' }}
      >
        <span className="text-xs font-medium">{meta.shortLabel}</span>
        <span className="mt-1 text-[10px] font-mono text-[#A8A7A5]">
          {Math.round(realWidth)}×{Math.round(realHeight)}
        </span>
      </button>
    );
  }

  const isHorizontal = zone.type === 'horizontal';
  const children = zone.children ?? [];
  const ratios = getChildRatios();

  // Inverser l'ordre pour les divisions horizontales (bas -> haut visuellement)
  const orderedChildren = isHorizontal ? [...children].reverse() : children;
  const orderedRatios = isHorizontal ? [...ratios].reverse() : ratios;

  // Calculer les dimensions réelles de chaque enfant
  const getChildDimensions = (index: number): { w: number; h: number } => {
    const ratio = orderedRatios[index] / 100;
    if (isHorizontal) {
      return { w: realWidth, h: realHeight * ratio };
    }
    return { w: realWidth * ratio, h: realHeight };
  };

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`relative flex h-full w-full border transition-all duration-200 ${
        isSelected
          ? 'border-[#8B7355] bg-[#8B7355]/5'
          : 'border-[#E8E6E3] bg-[#FAFAF9] hover:border-[#1A1917]'
      }`}
      style={{
        flexDirection: isHorizontal ? 'column' : 'row',
        borderRadius: '2px',
      }}
    >
      {orderedChildren.map((child, index) => {
        const dims = getChildDimensions(index);
        const showDivider = index < orderedChildren.length - 1;

        return (
          <div
            key={child.id}
            className="relative flex"
            style={{
              flexGrow: orderedRatios[index] ?? 1,
              flexBasis: 0,
              minWidth: isHorizontal ? undefined : '20px',
              minHeight: isHorizontal ? '20px' : undefined,
            }}
          >
            <ZoneNode
              zone={child}
              selectedZoneId={selectedZoneId}
              onSelect={onSelect}
              onRatioChange={onRatioChange}
              depth={depth + 1}
              realWidth={dims.w}
              realHeight={dims.h}
            />

            {/* Séparateur draggable */}
            {showDivider && onRatioChange && (
              <div
                className={`absolute z-10 ${
                  isHorizontal
                    ? 'bottom-0 left-0 right-0 h-3 -mb-1.5 cursor-row-resize'
                    : 'right-0 top-0 bottom-0 w-3 -mr-1.5 cursor-col-resize'
                }`}
                onMouseDown={handleDragStart(index)}
              >
                <div
                  className={`absolute bg-[#8B7355] transition-opacity ${
                    isDragging && dragIndex === index ? 'opacity-100' : 'opacity-0 hover:opacity-50'
                  } ${
                    isHorizontal
                      ? 'left-1/4 right-1/4 top-1/2 h-0.5 -translate-y-1/2'
                      : 'top-1/4 bottom-1/4 left-1/2 w-0.5 -translate-x-1/2'
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ZoneCanvasProps {
  zone: Zone;
  selectedZoneId: string;
  onSelect: (zoneId: string) => void;
  onRatioChange?: (zoneId: string, ratios: number[]) => void;
  // Dimensions réelles du meuble en mm
  width: number;
  height: number;
  maxCanvasHeight?: number;
}

export default function ZoneCanvas({
  zone,
  selectedZoneId,
  onSelect,
  onRatioChange,
  width,
  height,
  maxCanvasHeight = 300,
}: ZoneCanvasProps) {
  // Calculer les dimensions du canvas en conservant le ratio
  const aspectRatio = width / height;
  const maxWidth = 400; // Largeur max en pixels

  let canvasWidth: number;
  let canvasHeight: number;

  if (aspectRatio > maxWidth / maxCanvasHeight) {
    // Limité par la largeur
    canvasWidth = maxWidth;
    canvasHeight = maxWidth / aspectRatio;
  } else {
    // Limité par la hauteur
    canvasHeight = maxCanvasHeight;
    canvasWidth = maxCanvasHeight * aspectRatio;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
          Plan du meuble
        </span>
        <span className="font-mono text-xs text-[#706F6C]">
          {width} × {height} mm
        </span>
      </div>

      <div
        className="mx-auto border border-[#E8E6E3] bg-[#FAFAF9] p-2"
        style={{
          borderRadius: '2px',
          width: canvasWidth + 16, // +padding
        }}
      >
        <div
          className="relative"
          style={{
            width: canvasWidth,
            height: canvasHeight,
          }}
        >
          <ZoneNode
            zone={zone}
            selectedZoneId={selectedZoneId}
            onSelect={onSelect}
            onRatioChange={onRatioChange}
            realWidth={width}
            realHeight={height}
          />
        </div>
      </div>

      <p className="text-center text-xs text-[#A8A7A5]">
        Cliquez pour sélectionner • Glissez les séparateurs pour ajuster
      </p>
    </div>
  );
}
