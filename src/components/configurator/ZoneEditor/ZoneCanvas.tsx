import { useState, useRef, useCallback, useEffect, SyntheticEvent, KeyboardEvent, MouseEvent } from 'react';
import { Zone, ZoneContent, ZONE_CONTENT_META } from './types';

interface ZoneNodeProps {
    zone: Zone;
    selectedZoneId: string;
    onSelect: (zoneId: string) => void;
    onRatioChange?: (zoneId: string, ratios: number[]) => void;
    depth?: number;
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

    const getChildRatios = useCallback((): number[] => {
        const children = zone.children ?? [];
        if (children.length === 0) return [];
        if (children.length === 2 && zone.splitRatio !== undefined) {
            return [zone.splitRatio, 100 - zone.splitRatio];
        }
        if (children.length > 2 && zone.splitRatios?.length === children.length) {
            return zone.splitRatios;
        }
        return children.map(() => 100 / children.length);
    }, [zone]);

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
        const currentRatios = getChildRatios();

        const rawPos = isHorizontal
            ? (rect.bottom - e.clientY) / rect.height
            : (e.clientX - rect.left) / rect.width;

        const orderedRatios = isHorizontal ? [...currentRatios].reverse() : currentRatios;

        let cumBefore = 0;
        for (let i = 0; i <= dragIndex; i++) {
            cumBefore += orderedRatios[i];
        }

        const newCumBefore = Math.max(10, Math.min(90, rawPos * 100));
        const delta = newCumBefore - cumBefore;

        const newRatios = [...orderedRatios];
        const minRatio = 10;

        const newCurrentRatio = Math.max(minRatio, newRatios[dragIndex] + delta);
        const newNextRatio = Math.max(minRatio, newRatios[dragIndex + 1] - delta);

        if (newCurrentRatio >= minRatio && newNextRatio >= minRatio) {
            newRatios[dragIndex] = newCurrentRatio;
            newRatios[dragIndex + 1] = newNextRatio;

            const finalRatios = isHorizontal ? [...newRatios].reverse() : newRatios;
            onRatioChange(zone.id, finalRatios.map(r => Math.round(r)));
        }
    }, [isDragging, dragIndex, zone, onRatioChange, getChildRatios]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        setDragIndex(null);
    }, []);

    // Bloquer TOUS les scrolls pendant le drag
    const preventScroll = useCallback((e: Event) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    useEffect(() => {
        if (isDragging) {
            // Bloquer le scroll sur tout le document
            document.body.style.overflow = 'hidden';
            document.body.style.userSelect = 'none';

            // Bloquer les événements wheel/touchmove qui causent le scroll
            document.addEventListener('wheel', preventScroll, { passive: false });
            document.addEventListener('touchmove', preventScroll, { passive: false });

            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            return () => {
                // Restaurer
                document.body.style.overflow = '';
                document.body.style.userSelect = '';

                document.removeEventListener('wheel', preventScroll);
                document.removeEventListener('touchmove', preventScroll);

                window.removeEventListener('mousemove', handleDragMove);
                window.removeEventListener('mouseup', handleDragEnd);
            };
        }
    }, [isDragging, handleDragMove, handleDragEnd, preventScroll]);

    if (zone.type === 'leaf') {
        const meta = ZONE_CONTENT_META[zone.content ?? 'empty'];
        return (
            <button
                type="button"
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                className={`relative flex h-full w-full flex-col items-center justify-center border-2 transition-all duration-200 ${
                    isSelected
                        ? 'border-[#8B7355] bg-[#8B7355]/10 text-[#8B7355]'
                        : 'border-[#D0CEC9] bg-white text-[#706F6C] hover:border-[#1A1917] hover:bg-[#F5F5F4] hover:text-[#1A1917]'
                }`}
                style={{ borderRadius: '4px' }}
            >
                <span className="text-lg font-semibold">{meta.shortLabel}</span>
                <span className="mt-2 font-mono text-base text-[#706F6C]">
          {Math.round(realWidth)} × {Math.round(realHeight)} mm
        </span>
            </button>
        );
    }

    const isHorizontal = zone.type === 'horizontal';
    const children = zone.children ?? [];
    const ratios = getChildRatios();

    const orderedChildren = isHorizontal ? [...children].reverse() : children;
    const orderedRatios = isHorizontal ? [...ratios].reverse() : ratios;

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
            className={`relative flex h-full w-full border-2 transition-all duration-200 ${
                isSelected
                    ? 'border-[#8B7355] bg-[#8B7355]/5'
                    : 'border-[#D0CEC9] bg-[#FAFAF9] hover:border-[#1A1917]'
            }`}
            style={{
                flexDirection: isHorizontal ? 'column' : 'row',
                borderRadius: '4px',
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
                            minWidth: isHorizontal ? undefined : '40px',
                            minHeight: isHorizontal ? '40px' : undefined,
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

                        {showDivider && onRatioChange && (
                            <div
                                className={`absolute z-20 ${
                                    isHorizontal
                                        ? 'bottom-0 left-0 right-0 h-8 -mb-4 cursor-row-resize'
                                        : 'right-0 top-0 bottom-0 w-8 -mr-4 cursor-col-resize'
                                }`}
                                onMouseDown={handleDragStart(index)}
                                style={{ touchAction: 'none' }}
                            >
                                <div
                                    className={`absolute bg-[#8B7355] transition-opacity ${
                                        isDragging && dragIndex === index ? 'opacity-100' : 'opacity-30 hover:opacity-80'
                                    } ${
                                        isHorizontal
                                            ? 'left-1/4 right-1/4 top-1/2 h-1.5 -translate-y-1/2'
                                            : 'top-1/4 bottom-1/4 left-1/2 w-1.5 -translate-x-1/2'
                                    }`}
                                    style={{ borderRadius: '2px' }}
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
    width: number;
    height: number;
}

export default function ZoneCanvas({
                                       zone,
                                       selectedZoneId,
                                       onSelect,
                                       onRatioChange,
                                       width,
                                       height,
                                   }: ZoneCanvasProps) {
    // ✅ GRAND CANVAS - Prend toute la largeur disponible du panneau
    // Le panneau fait 560px, moins padding = ~500px disponibles
    const maxWidth = 500;
    const maxHeight = 400;

    // Calcul du ratio réel du meuble (identique au modèle 3D)
    const aspectRatio = width / height;

    let canvasWidth: number;
    let canvasHeight: number;

    if (aspectRatio > maxWidth / maxHeight) {
        // Meuble large → limité par la largeur
        canvasWidth = maxWidth;
        canvasHeight = maxWidth / aspectRatio;
    } else {
        // Meuble haut → limité par la hauteur
        canvasHeight = maxHeight;
        canvasWidth = maxHeight * aspectRatio;
    }

    // Assurer une taille minimum lisible
    canvasWidth = Math.max(canvasWidth, 300);
    canvasHeight = Math.max(canvasHeight, 200);

    return (
        <div className="border border-[#E8E6E3] bg-white p-5" style={{ borderRadius: '4px' }}>
            {/* Header - Titre et dimensions */}
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#1A1917]">Plan du meuble</h3>
                <span className="font-mono text-base font-medium text-[#1A1917]">
                    {width} × {height} mm
                </span>
            </div>

            {/* Canvas GRAND - Conteneur qui s'adapte au canvas */}
            <div
                className="mx-auto inline-flex items-center justify-center bg-[#FAFAF9] p-4"
                style={{
                    borderRadius: '4px',
                    width: canvasWidth + 32, // canvas + padding (16px * 2)
                    minWidth: canvasWidth + 32,
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

            {/* Instruction claire */}
            <p className="mt-4 text-center text-base text-[#706F6C]">
                Cliquez sur une zone pour la modifier
            </p>
        </div>
    );
}