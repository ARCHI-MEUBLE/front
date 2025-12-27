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

        // Calcul de la position normalisée (0 à 1)
        // Pour horizontal : de haut en bas (e.clientY - rect.top)
        // Pour vertical : de gauche à droite (e.clientX - rect.left)
        const rawPos = isHorizontal
            ? (e.clientY - rect.top) / rect.height
            : (e.clientX - rect.left) / rect.width;

        // Les ratios sont stockés de haut en bas (horizontal) ou gauche à droite (vertical)
        const orderedRatios = currentRatios;

        // Calculer la position cumulative avant et après le diviseur
        let cumBefore = 0;
        for (let i = 0; i <= dragIndex; i++) {
            cumBefore += orderedRatios[i];
        }

        // Position cumulée souhaitée (basée sur la position de la souris)
        let desiredCumBefore = rawPos * 100;

        // Calculer les limites pour que chaque zone ait au moins 10%
        const minRatio = 10;
        const numZones = orderedRatios.length;

        // Limite min : somme des ratios min des zones avant + ratio min de la zone courante
        const minCumBefore = (dragIndex + 1) * minRatio;

        // Limite max : 100 - somme des ratios min des zones après
        const maxCumBefore = 100 - (numZones - dragIndex - 1) * minRatio;

        // Appliquer les limites
        desiredCumBefore = Math.max(minCumBefore, Math.min(maxCumBefore, desiredCumBefore));

        const delta = desiredCumBefore - cumBefore;

        // Ne rien faire si le delta est trop petit (évite les micro-mouvements)
        if (Math.abs(delta) < 0.5) return;

        const newRatios = [...orderedRatios];
        newRatios[dragIndex] += delta;
        newRatios[dragIndex + 1] -= delta;

        // Normaliser pour garantir que la somme = 100
        const sum = newRatios.reduce((a, b) => a + b, 0);
        const normalizedRatios = newRatios.map(r => (r / sum) * 100);

        // Vérifier que tous les ratios sont >= minRatio
        const allValid = normalizedRatios.every(r => r >= minRatio - 0.1);

        if (allValid) {
            onRatioChange(zone.id, normalizedRatios.map(r => Math.round(r * 10) / 10));
        }
    }, [isDragging, dragIndex, zone, onRatioChange, getChildRatios]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        setDragIndex(null);
    }, []);

    useEffect(() => {
        if (isDragging) {
            // Bloquer TOUT scroll pendant le drag
            const scrollableParent = containerRef.current?.closest('.overflow-y-auto');

            document.body.style.overflow = 'hidden';
            document.body.style.userSelect = 'none';
            document.documentElement.style.overflow = 'hidden';

            if (scrollableParent) {
                (scrollableParent as HTMLElement).style.overflow = 'hidden';
            }

            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);

            return () => {
                document.body.style.overflow = '';
                document.body.style.userSelect = '';
                document.documentElement.style.overflow = '';

                if (scrollableParent) {
                    (scrollableParent as HTMLElement).style.overflow = '';
                }

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

    // Pas d'inversion - affichage dans l'ordre naturel (haut en bas, gauche à droite)
    const orderedChildren = children;
    const orderedRatios = ratios;

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
                className="mx-auto inline-flex items-center justify-center overflow-x-auto bg-[#FAFAF9] p-4"
                style={{
                    borderRadius: '4px',
                    width: canvasWidth + 32, // canvas + padding (16px * 2)
                    minWidth: canvasWidth + 32,
                    maxWidth: '100%', // Empêcher le débordement
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