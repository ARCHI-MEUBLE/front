import { useState, useRef, useCallback, useEffect, useId, SyntheticEvent, KeyboardEvent } from 'react';
import { Archive, BoxSelect, DoorClosed, Frame, Hand, Shirt, Sparkles, Square, SquareDashed, type LucideIcon } from 'lucide-react';
import { Zone, ZoneContent, ZONE_CONTENT_META } from './types';
import { moveDivider } from '@/lib/configurator/zoneResize';
import { getZoneInteriorSizeMm, PLINTH_HEIGHT_M } from '@/lib/configurator/zoneBounds';
import { layoutLeafText } from './leafLayout';

// Jamais plus large que ça, même sur un très grand écran
const MAX_CANVAS_WIDTH = 1100;

// Place réservée à la ligne de cote globale (largeur en haut, hauteur sur le côté)
const DIMENSION_GUTTER_PX = 28;
const DIMENSION_ARROW_PX = 7;

// Hauteur (mm) du socle quand il est actif
const PLINTH_HEIGHT_MM = PLINTH_HEIGHT_M * 1000;

// Ligne de cote « à l'architecte » : traits de rappel depuis les bords du plan, puis ligne à
// double flèche portant la mesure, comme sur un plan technique
function DimensionLine({
    length,
    label,
    orientation,
}: {
    length: number;
    label: string;
    orientation: 'horizontal' | 'vertical';
}) {
    const markerId = `dim-arrow-${orientation}-${useId()}`;
    const axisLength = Math.max(1, length);
    const arrow = DIMENSION_ARROW_PX;

    const arrowMarker = (
        <marker id={markerId} markerWidth={arrow} markerHeight={arrow} refX={arrow / 2} refY={arrow / 2} orient="auto-start-reverse">
            <path d={`M0,0 L${arrow},${arrow / 2} L0,${arrow} Z`} className="fill-current" />
        </marker>
    );

    if (orientation === 'horizontal') {
        const lineY = DIMENSION_GUTTER_PX - 6;
        return (
            <svg width={axisLength} height={DIMENSION_GUTTER_PX} className="block text-black/55" style={{ overflow: 'visible' }}>
                <defs>{arrowMarker}</defs>
                <line x1={0} y1={0} x2={0} y2={lineY} className="stroke-current" strokeWidth={1} />
                <line x1={axisLength} y1={0} x2={axisLength} y2={lineY} className="stroke-current" strokeWidth={1} />
                <line
                    x1={1}
                    y1={lineY}
                    x2={axisLength - 1}
                    y2={lineY}
                    className="stroke-current"
                    strokeWidth={1}
                    markerStart={`url(#${markerId})`}
                    markerEnd={`url(#${markerId})`}
                />
                <text x={axisLength / 2} y={lineY - 5} textAnchor="middle" className="fill-current font-mono" style={{ fontSize: 11 }}>
                    {label}
                </text>
            </svg>
        );
    }

    const lineX = DIMENSION_GUTTER_PX - 6;
    return (
        <svg width={DIMENSION_GUTTER_PX} height={axisLength} className="block text-black/55" style={{ overflow: 'visible' }}>
            <defs>{arrowMarker}</defs>
            <line x1={0} y1={0} x2={lineX} y2={0} className="stroke-current" strokeWidth={1} />
            <line x1={0} y1={axisLength} x2={lineX} y2={axisLength} className="stroke-current" strokeWidth={1} />
            <line
                x1={lineX}
                y1={1}
                x2={lineX}
                y2={axisLength - 1}
                className="stroke-current"
                strokeWidth={1}
                markerStart={`url(#${markerId})`}
                markerEnd={`url(#${markerId})`}
            />
            <text
                x={lineX - 5}
                y={axisLength / 2}
                textAnchor="middle"
                className="fill-current font-mono"
                style={{ fontSize: 11 }}
                transform={`rotate(-90 ${lineX - 5} ${axisLength / 2})`}
            >
                {label}
            </text>
        </svg>
    );
}

interface LeafVisual {
    // Même icône que dans le panneau de réglage : on reconnaît le contenu d'un coup d'œil
    Icon?: LucideIcon;
    // Couleurs de la case au repos (sélectionnée, elle passe au bleu foncé)
    classes: string;
}

const EMPTY_VISUAL: LeafVisual = { classes: 'border-black/20 bg-white text-black/65 hover:bg-am-mist/30' };
const DRAWER_VISUAL = (Icon: LucideIcon): LeafVisual => ({ Icon, classes: 'border-am-wine/35 bg-am-wine/10 text-am-wine' });
const DOOR_VISUAL = (Icon: LucideIcon): LeafVisual => ({ Icon, classes: 'border-am-mist bg-am-mist/35 text-am-navy' });
const GLASS_VISUAL = (Icon: LucideIcon): LeafVisual => ({ Icon, classes: 'border-am-mist bg-am-mist/20 text-am-navy' });

function getLeafVisual(content: ZoneContent | undefined): LeafVisual {
    switch (content) {
        case 'drawer': return DRAWER_VISUAL(Archive);
        case 'push_drawer': return DRAWER_VISUAL(BoxSelect);
        case 'door':
        case 'door_right':
        case 'door_double': return DOOR_VISUAL(DoorClosed);
        case 'push_door':
        case 'push_door_right': return DOOR_VISUAL(Hand);
        case 'mirror_door':
        case 'mirror_door_right': return GLASS_VISUAL(Sparkles);
        case 'glass_shelf': return GLASS_VISUAL(Square);
        case 'dressing': return DRAWER_VISUAL(Shirt);
        case 'niche': return { Icon: SquareDashed, classes: 'border-am-navy/30 bg-am-navy/10 text-am-navy' };
        default: return EMPTY_VISUAL;
    }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface ZoneNodeProps {
    zone: Zone;
    selectedZoneIds: string[];
    onSelect: (zoneId: string | null, multi?: boolean) => void;
    onRatioChange?: (zoneId: string, ratios: number[]) => void;
    depth?: number;
    realWidth: number;
    realHeight: number;
    showNumbers?: boolean;
    leafNumbers?: Record<string, number>;
    // Taille intérieure utile (mm, planches déduites) de chaque compartiment, pour l'afficher à la place
    // de sa taille nominale (voir getZoneInteriorSizeMm)
    leafInteriorSizes?: Record<string, { width: number; height: number }>;
    // Pixels par millimètre : permet d'adapter le texte à la taille de la case à l'écran
    pxPerMm?: number;
    // Planches retirées avec l'outil 3D, et chemin de la zone au format des identifiants de ThreeCanvas
    // (séparateur « separator-h-<chemin>h<i>-<segment> »)
    deletedPanelIds?: ReadonlySet<string>;
    panelPath?: string;
}

function ZoneNode({
                      zone,
                      selectedZoneIds,
                      onSelect,
                      onRatioChange,
                      depth = 0,
                      realWidth,
                      realHeight,
                      showNumbers = false,
                      leafNumbers,
                      leafInteriorSizes,
                      pxPerMm,
                      deletedPanelIds,
                      panelPath = '',
                  }: ZoneNodeProps) {
    const isSelected = selectedZoneIds.includes(zone.id);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    const handleClick = (event: SyntheticEvent) => {
        event.stopPropagation();
        onSelect(zone.id, false);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement | HTMLButtonElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const isMulti = event.shiftKey || event.ctrlKey || event.metaKey;
            onSelect(zone.id, isMulti);
        }
    };

    const getChildRatios = useCallback((): number[] => {
        const children = zone.children ?? [];
        if (children.length === 0) return [];
        
        if (zone.splitRatios?.length === children.length) {
            return zone.splitRatios;
        }
        
        if (children.length === 2 && zone.splitRatio !== undefined) {
            return [zone.splitRatio, 100 - zone.splitRatio];
        }
        
        return children.map(() => 100 / children.length);
    }, [zone]);

    const handleDragStart = (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setDragIndex(index);
    };

    const handleDragMove = useCallback((e: PointerEvent) => {
        if (!isDragging || dragIndex === null || !containerRef.current || !onRatioChange) return;

        const rect = containerRef.current.getBoundingClientRect();
        const isHorizontal = zone.type === 'horizontal';

        // Position du pointeur dans le groupe (%), de haut en bas (étagères) ou de gauche à droite (colonnes)
        const targetPercent = isHorizontal
            ? ((e.clientY - rect.top) / rect.height) * 100
            : ((e.clientX - rect.left) / rect.width) * 100;

        // Même règle que les poignées de la vue 3D : seuls les deux voisins changent, chacun garde sa taille
        // minimale (sous-groupes compris). En dessous de 0,5 %, on ignore le mouvement (micro-déplacements).
        const ratios = moveDivider(zone, dragIndex, targetPercent, isHorizontal ? realHeight : realWidth, 0.5);
        if (ratios) onRatioChange(zone.id, ratios);
    }, [isDragging, dragIndex, zone, onRatioChange, realWidth, realHeight]);

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

            window.addEventListener('pointermove', handleDragMove);
            window.addEventListener('pointerup', handleDragEnd);
            window.addEventListener('pointercancel', handleDragEnd);

            return () => {
                document.body.style.overflow = '';
                document.body.style.userSelect = '';
                document.documentElement.style.overflow = '';

                if (scrollableParent) {
                    (scrollableParent as HTMLElement).style.overflow = '';
                }

                window.removeEventListener('pointermove', handleDragMove);
                window.removeEventListener('pointerup', handleDragEnd);
                window.removeEventListener('pointercancel', handleDragEnd);
            };
        }
    }, [isDragging, handleDragMove, handleDragEnd]);

    if (zone.type === 'leaf') {
        const meta = ZONE_CONTENT_META[zone.content ?? 'empty'] || ZONE_CONTENT_META['empty'];
        const zoneNumber = leafNumbers?.[zone.id];
        const isOpenSpace = zone.isOpenSpace;
        const visual = getLeafVisual(zone.content);
        // Taille intérieure utile (planches déduites) quand elle est connue, sinon la taille nominale de la case
        const interior = leafInteriorSizes?.[zone.id];
        const widthMm = Math.round(interior?.width ?? realWidth);
        const heightMm = Math.round(interior?.height ?? realHeight);
        const description = isOpenSpace ? `Espace ouvert, ${heightMm} × ${widthMm} mm` : `${meta.label}, ${heightMm} × ${widthMm} mm`;

        // Ce que la case peut afficher selon sa taille réelle à l'écran : le contenu reste toujours
        // reconnaissable (couleur et icône), même dans une case minuscule d'un très grand meuble
        const pxWidth = pxPerMm ? realWidth * pxPerMm : Infinity;
        const pxHeight = pxPerMm ? realHeight * pxPerMm : Infinity;
        const Icon = visual.Icon;
        const layout = layoutLeafText({ pxWidth, pxHeight, label: meta.shortLabel, widthMm, heightMm, hasIcon: !!Icon });

        return (
            <button
                type="button"
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                title={description}
                aria-label={description}
                className={`relative flex h-full w-full flex-col items-center justify-center gap-px overflow-hidden border-2 transition-all duration-200 ${
                    isSelected
                        ? 'border-am-navy bg-am-navy text-white z-10 shadow-[0_0_0_3px_rgba(59,62,88,0.25)]'
                        : isOpenSpace
                            ? 'border-am-navy border-dashed bg-am-mist/20 text-am-navy hover:bg-am-mist/40'
                            : `${visual.classes} hover:border-am-navy/50`
                }`}
                style={{ borderRadius: '4px' }}
            >
                {showNumbers && zoneNumber && (
                    // Pastille inversée sur une case choisie (fond navy), sinon elle s'y fond
                    <div className={`absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold shadow-sm ${isSelected ? 'bg-white text-am-navy' : 'bg-am-navy text-white'}`}>
                        {zoneNumber}
                    </div>
                )}
                {isOpenSpace ? (
                    <>
                        <Frame className="mb-1 h-6 w-6" aria-hidden="true" />
                        <span className="text-sm font-semibold">Espace ouvert</span>
                        <span className="text-xs opacity-80">Pas de fond</span>
                    </>
                ) : (
                    <>
                        {Icon && layout.icon > 0 && <Icon style={{ width: layout.icon, height: layout.icon }} />}
                        {layout.label && (
                            <span className="whitespace-nowrap font-semibold leading-tight" style={{ fontSize: layout.label.size }}>
                                {layout.label.text}
                            </span>
                        )}
                        {layout.dims && (
                            <span className="whitespace-nowrap text-center font-mono leading-tight opacity-80" style={{ fontSize: layout.dims.size }}>
                                {layout.dims.text}
                            </span>
                        )}
                    </>
                )}
            </button>
        );
    }

    const isHorizontal = zone.type === 'horizontal';
    const children = zone.children ?? [];
    const ratios = getChildRatios();
    const currentDoor = zone.doorContent || null;
    const meta = ZONE_CONTENT_META[currentDoor ?? 'empty'] || ZONE_CONTENT_META['empty'];
    const hasDoor = currentDoor && currentDoor !== 'empty' && currentDoor.includes('door');

    // Pas d'inversion - affichage dans l'ordre naturel (haut en bas, gauche à droite)
    const orderedChildren = children;
    const orderedRatios = ratios;
    const groupPxWidth = pxPerMm ? realWidth * pxPerMm : Infinity;

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
                    ? 'border-am-navy bg-am-navy/5 ring-2 ring-am-navy/20'
                    : 'border-black/20 bg-am-mist/15 hover:border-am-navy/50'
            }`}
            style={{
                flexDirection: isHorizontal ? 'column' : 'row',
                borderRadius: '4px',
                padding: '2px', // Petit padding pour voir la sélection du parent autour des enfants
            }}
        >
            {hasDoor && (
                <>
                    {/* Contour en pointillés : la porte recouvre tout le groupe */}
                    <div
                        className="pointer-events-none absolute inset-[3px] z-10 border-2 border-dashed border-am-navy/40"
                        style={{ borderRadius: '3px' }}
                    />
                    <div
                        className="pointer-events-none absolute left-1/2 top-[5px] z-10 flex max-w-[95%] -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-white/20 bg-am-navy/85 px-2 py-0.5 text-[10px] font-semibold text-white shadow"
                        title={meta.label}
                    >
                        <DoorClosed className="h-3 w-3 flex-shrink-0" />
                        {groupPxWidth >= 90 && <span className="truncate">{meta.shortLabel}</span>}
                    </div>
                </>
            )}
            {orderedChildren.map((child, index) => {
                const dims = getChildDimensions(index);
                const showDivider = index < orderedChildren.length - 1;
                // Zone de saisie du séparateur : proportionnée aux petites cases voisines pour ne jamais
                // les recouvrir entièrement (sinon elles ne seraient plus cliquables)
                const nextDims = showDivider ? getChildDimensions(index + 1) : dims;
                const smallestPx = pxPerMm
                    ? Math.min(isHorizontal ? dims.h : dims.w, isHorizontal ? nextDims.h : nextDims.w) * pxPerMm
                    : Infinity;
                const grip = Number.isFinite(smallestPx) ? clamp(smallestPx * 0.4, 10, 32) : 32;

                const childPath = orderedChildren.length === 1
                    ? `${panelPath}c0-`
                    : `${panelPath}${isHorizontal ? 'r' : 'c'}${index}-`;
                const axis = isHorizontal ? 'h' : 'v';
                const separatorPrefix = `separator-${axis}-${panelPath}${axis}${index}-`;
                const dividerRemoved =
                    showDivider && !!deletedPanelIds && Array.from(deletedPanelIds).some((id) => id.startsWith(separatorPrefix));

                return (
                    <div
                        key={child.id}
                        className="relative flex"
                        style={{
                            flexGrow: orderedRatios[index] ?? 1,
                            flexBasis: 0,
                            minWidth: 0,
                            minHeight: 0,
                        }}
                    >
                        <ZoneNode
                            zone={child}
                            selectedZoneIds={selectedZoneIds}
                            onSelect={onSelect}
                            onRatioChange={onRatioChange}
                            depth={depth + 1}
                            realWidth={dims.w}
                            realHeight={dims.h}
                            showNumbers={showNumbers}
                            leafNumbers={leafNumbers}
                            leafInteriorSizes={leafInteriorSizes}
                            pxPerMm={pxPerMm}
                            deletedPanelIds={deletedPanelIds}
                            panelPath={childPath}
                        />

                        {dividerRemoved && (
                            // Planche retirée dans la vue 3D : le plan la montre en pointillés au lieu d'un séparateur plein
                            <div
                                className={`pointer-events-none absolute z-30 flex items-center justify-center ${
                                    isHorizontal ? 'bottom-0 left-0 right-0 h-0' : 'right-0 top-0 bottom-0 w-0'
                                }`}
                                title="Planche retirée"
                            >
                                <div
                                    className={`absolute border-dashed border-am-wine ${
                                        isHorizontal ? 'left-0 right-0 border-t-2' : 'top-0 bottom-0 border-l-2'
                                    }`}
                                />
                                <span className="relative whitespace-nowrap rounded-sm bg-am-wine px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                                    Planche retirée
                                </span>
                            </div>
                        )}

                        {showDivider && onRatioChange && (
                            <div
                                className={`absolute z-20 ${
                                    isHorizontal
                                        ? 'bottom-0 left-0 right-0 cursor-row-resize'
                                        : 'right-0 top-0 bottom-0 cursor-col-resize'
                                }`}
                                onPointerDown={handleDragStart(index)}
                                style={
                                    isHorizontal
                                        ? { height: grip, marginBottom: -grip / 2, touchAction: 'none' }
                                        : { width: grip, marginRight: -grip / 2, touchAction: 'none' }
                                }
                            >
                                <div
                                    className={`absolute bg-am-navy transition-opacity ${
                                        isDragging && dragIndex === index ? 'opacity-100' : 'opacity-30 hover:opacity-80'
                                    } ${
                                        isHorizontal
                                            ? 'left-[15%] right-[15%] top-1/2 h-1.5 -translate-y-1/2'
                                            : 'top-[15%] bottom-[15%] left-1/2 w-1.5 -translate-x-1/2'
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
    selectedZoneIds: string[];
    onSelect: (zoneId: string | null, multi?: boolean) => void;
    onRatioChange?: (zoneId: string, ratios: number[]) => void;
    width: number;
    height: number;
    showNumbers?: boolean;
    // Hauteur maximale du dessin en pixels (400 par défaut)
    maxCanvasHeight?: number;
    // Planches retirées avec l'outil 3D « Retirer planches »
    deletedPanelIds?: ReadonlySet<string>;
    // Le meuble a des pieds/un socle : réduit la hauteur intérieure utile affichée dans chaque compartiment,
    // et ajoute une bande sous le plan représentant le socle
    hasSocle?: boolean;
    // Bords avant arrondis actifs : ajoute un repère schématique sur le bord gauche/droit du plan
    roundedLeft?: boolean;
    roundedLeftWidthMm?: number;
    roundedRight?: boolean;
    roundedRightWidthMm?: number;
}

export default function ZoneCanvas({
                                       zone,
                                       selectedZoneIds,
                                       onSelect,
                                       onRatioChange,
                                       width,
                                       height,
                                       showNumbers = false,
                                       maxCanvasHeight = 400,
                                       deletedPanelIds,
                                       hasSocle = false,
                                       roundedLeft = false,
                                       roundedLeftWidthMm = 0,
                                       roundedRight = false,
                                       roundedRightWidthMm = 0,
                                   }: ZoneCanvasProps) {
                                       const canvasContainerRef = useRef<HTMLDivElement>(null);
                                       const [availableWidth, setAvailableWidth] = useState<number | null>(null);
    // Largeur déclarée d'origine (bords arrondis compris) : `width` reçu ici est déjà réduit des
    // extensions actives (voir getUsableWidthMm). On reconstruit le total pour que la ligne de cote et
    // la mise à l'échelle portent sur l'enveloppe complète, comme `height` le fait déjà pour le socle.
    const declaredWidthMm = width + (roundedLeft ? roundedLeftWidthMm : 0) + (roundedRight ? roundedRightWidthMm : 0);

    // Calcul du ratio réel du meuble (identique au modèle 3D), dans la boîte disponible. La boîte
    // réserve en plus la place des lignes de cote (gutter) pour que l'ensemble tienne dans l'espace alloué.
    const aspectRatio = declaredWidthMm / height;
    const boxWidth = availableWidth === null ? 500 : Math.max(1, Math.min(availableWidth - 32, MAX_CANVAS_WIDTH));
    const boxHeight = Math.max(1, maxCanvasHeight);
    const drawableWidth = Math.max(1, boxWidth - DIMENSION_GUTTER_PX);
    const drawableHeight = Math.max(1, boxHeight - DIMENSION_GUTTER_PX);

    let canvasWidth: number;
    let canvasHeight: number;

    if (aspectRatio > drawableWidth / drawableHeight) {
        canvasWidth = drawableWidth;
        canvasHeight = drawableWidth / aspectRatio;
    } else {
        canvasHeight = drawableHeight;
        canvasWidth = drawableHeight * aspectRatio;
    }

    canvasWidth = Math.max(1, canvasWidth);
    canvasHeight = Math.max(1, canvasHeight);

    // Le caisson occupe la hauteur totale moins le socle (comme la scène 3D) ; le socle est redessiné
    // en-dessous sous forme de bande, à la même échelle, pour que les deux se recollent à la hauteur totale
    const mmToPx = canvasHeight / height;
    const sideHeightMm = hasSocle ? Math.max(1, height - PLINTH_HEIGHT_MM) : height;
    const socleCanvasHeight = hasSocle ? PLINTH_HEIGHT_MM * mmToPx : 0;
    const carcassCanvasHeight = canvasHeight - socleCanvasHeight;

    // Même principe sur la largeur : le caisson occupe la largeur utile, les bords arrondis actifs sont
    // redessinés en bandes de part et d'autre, à la même échelle, pour recoller à la largeur totale
    const carcassCanvasWidth = width * mmToPx;
    const roundedLeftCanvasWidth = roundedLeft ? roundedLeftWidthMm * mmToPx : 0;
    const roundedRightCanvasWidth = roundedRight ? roundedRightWidthMm * mmToPx : 0;

    useEffect(() => {
        const element = canvasContainerRef.current;
        if (!element) return;

        const updateWidth = () => setAvailableWidth(element.clientWidth);
        updateWidth();
        const observer = new ResizeObserver(updateWidth);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    // ✅ Calculer les numéros de feuilles, et la taille intérieure utile de chacune (planches déduites),
    // de manière pure
    const leafNumbers: Record<string, number> = {};
    const leafInteriorSizes: Record<string, { width: number; height: number }> = {};
    let count = 0;
    const computeNumbers = (z: Zone) => {
        if (z.type === 'leaf') {
            count++;
            leafNumbers[z.id] = count;
            const interior = getZoneInteriorSizeMm(zone, z.id, width, height, hasSocle);
            if (interior) leafInteriorSizes[z.id] = interior;
        }
        if (z.children) {
            z.children.forEach(computeNumbers);
        }
    };
    computeNumbers(zone);

    return (
        <div className="border border-black/10 bg-white p-5" style={{ borderRadius: '4px' }}>
            {/* Header - Titre seul : les dimensions sont maintenant portées par les lignes de cote */}
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-black">Plan du meuble</h3>
            </div>

            {/* Canvas GRAND - Conteneur qui s'adapte au canvas */}
            <div
                ref={canvasContainerRef}
                className="mx-auto flex w-full items-center justify-center overflow-hidden bg-am-mist/15 p-2 cursor-default sm:p-4"
                onClick={() => onSelect(null)}
                style={{
                    borderRadius: '4px',
                }}
            >
                <div className="inline-flex flex-col">
                    {/* Cote de largeur : alignée sur le plan, décalée de la gouttière réservée à la cote de hauteur.
                        Porte la largeur totale déclarée, bords arrondis compris. */}
                    <div className="flex" style={{ paddingLeft: DIMENSION_GUTTER_PX }}>
                        <DimensionLine orientation="horizontal" length={canvasWidth} label={`${Math.round(declaredWidthMm)} mm`} />
                    </div>
                    <div className="flex">
                        <DimensionLine orientation="vertical" length={canvasHeight} label={`${Math.round(height)} mm`} />
                        <div className="flex flex-col">
                            {/* Caisson, flanqué des bandes de bord arrondi actives : même principe que le socle,
                                juste des rectangles à l'échelle, de part et d'autre plutôt qu'en dessous */}
                            <div className="flex" style={{ height: carcassCanvasHeight }}>
                                {roundedLeft && (
                                    <div
                                        className="flex flex-col items-center justify-center gap-0.5 overflow-hidden border border-black/15 bg-am-mist/50"
                                        style={{ width: roundedLeftCanvasWidth, height: carcassCanvasHeight }}
                                        title={`Bord gauche arrondi : ${Math.round(roundedLeftWidthMm)} mm`}
                                    >
                                        <span className="whitespace-nowrap font-semibold leading-tight text-black/65" style={{ fontSize: 18 }}>
                                            Arrondis
                                        </span>
                                        <span className="whitespace-nowrap font-mono text-[10px] text-black/65">
                                            {Math.round(sideHeightMm)} × {Math.round(roundedLeftWidthMm)} mm
                                        </span>
                                    </div>
                                )}
                                <div
                                    className="relative"
                                    style={{
                                        width: carcassCanvasWidth,
                                        height: carcassCanvasHeight,
                                    }}
                                >
                                    <ZoneNode
                                        zone={zone}
                                        selectedZoneIds={selectedZoneIds}
                                        onSelect={onSelect}
                                        onRatioChange={onRatioChange}
                                        realWidth={width}
                                        realHeight={sideHeightMm}
                                        showNumbers={showNumbers}
                                        leafNumbers={leafNumbers}
                                        leafInteriorSizes={leafInteriorSizes}
                                        pxPerMm={mmToPx}
                                        deletedPanelIds={deletedPanelIds}
                                    />
                                </div>
                                {roundedRight && (
                                    <div
                                        className="flex flex-col items-center justify-center gap-0.5 overflow-hidden border border-black/15 bg-am-mist/50"
                                        style={{ width: roundedRightCanvasWidth, height: carcassCanvasHeight }}
                                        title={`Bord droit arrondi : ${Math.round(roundedRightWidthMm)} mm`}
                                    >
                                        <span className="whitespace-nowrap font-semibold leading-tight text-black/65" style={{ fontSize: 18 }}>
                                            Arrondis
                                        </span>
                                        <span className="whitespace-nowrap font-mono text-[10px] text-black/65">
                                            {Math.round(sideHeightMm)} × {Math.round(roundedRightWidthMm)} mm
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Socle : bande pleine largeur sous le caisson, à la même échelle que le reste du plan */}
                            {hasSocle && (
                                <div
                                    className="flex items-center justify-center gap-2 overflow-hidden border border-black/15 bg-am-mist/50"
                                    style={{ width: canvasWidth, height: socleCanvasHeight }}
                                    title={`Socle : ${Math.round(PLINTH_HEIGHT_MM)} mm`}
                                >
                                    <span className="whitespace-nowrap font-semibold leading-tight text-black/65" style={{ fontSize: 18 }}>
                                        Socle
                                    </span>
                                    <span className="whitespace-nowrap font-mono text-[10px] text-black/65">
                                        {Math.round(PLINTH_HEIGHT_MM)} × {Math.round(declaredWidthMm)} mm
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Instruction claire */}
            <p className="mt-4 text-center text-base text-black/65">
                {showNumbers ? "Les numéros correspondent à l'inventaire détaillé" : "Cliquez sur une zone pour la modifier"}
            </p>
        </div>
    );
}