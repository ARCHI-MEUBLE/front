import { useState, useRef, useCallback, useEffect, SyntheticEvent, KeyboardEvent } from 'react';
import { Archive, ArrowLeftRight, BoxSelect, DoorClosed, Frame, Hand, Pencil, Shirt, Sparkles, SquareDashed, type LucideIcon } from 'lucide-react';
import { Zone, ZoneContent, ZONE_CONTENT_META } from './types';
import { moveDivider } from '@/lib/configurator/zoneResize';
import { getZoneInteriorSizeMm, PLINTH_HEIGHT_M } from '@/lib/configurator/zoneBounds';
import { planChain, type ChainSegment, type PlanFrame } from '@/lib/configurator/planDimensions';
import type { DimensionKey } from '@/lib/configurator/constraints';
import { layoutLeafText } from './leafLayout';
import { CHAIN_GUTTER_PX, DIMENSION_GUTTER_PX, DimensionChain, DimensionLine, PlanValue, type ChainItem } from './PlanDimensions';
import {
    activeAxis,
    dimensionForDivider,
    setActiveDimension,
    splitDimsText,
    useActiveDimension,
    type DimensionAxis,
} from '@/lib/configurator/activeDimension';

// Jamais plus large que ça, même sur un très grand écran
const MAX_CANVAS_WIDTH = 1100;

// Halo autour du nombre en cours de réglage (largeur ou hauteur) : clair sur la case sélectionnée (fond navy),
// navy sur les cases claires d'un caisson ou d'une étagère sélectionnés
const DIMENSION_GLOW_ON_DARK =
    'rounded-[3px] bg-white/25 px-0.5 text-white ring-1 ring-white/80 shadow-[0_0_10px_2px_rgba(255,255,255,0.6)] [text-shadow:0_0_6px_rgba(255,255,255,0.9)]';
const DIMENSION_GLOW_ON_LIGHT =
    'rounded-[3px] bg-white px-0.5 font-semibold text-am-navy ring-1 ring-am-navy/70 shadow-[0_0_10px_2px_rgba(59,62,88,0.45)]';

// Saisie des deux nombres d'une case (taille intérieure, mm)
export interface LeafDimsEdit {
    onHeight: (valueMm: number) => void;
    onWidth: (valueMm: number) => void;
}

// Cote d'une case « hauteur × largeur » ; highlight éclaire le nombre que l'utilisateur règle, edit rend chaque
// nombre modifiable au double-clic
export function LeafDims({
    text,
    size,
    highlight,
    onDark = true,
    edit,
}: {
    text: string;
    size: number;
    highlight: DimensionAxis | null;
    onDark?: boolean;
    edit?: LeafDimsEdit;
}) {
    const parts = highlight || edit ? splitDimsText(text) : null;
    const DIMENSION_GLOW = onDark ? DIMENSION_GLOW_ON_DARK : DIMENSION_GLOW_ON_LIGHT;
    const number = (axis: DimensionAxis, value: string) => {
        const glow = `transition-shadow ${highlight === axis ? DIMENSION_GLOW : ''}`;
        if (!edit) {
            return (
                <span className={glow} data-dimension={axis}>
                    {value}
                </span>
            );
        }
        return (
            <PlanValue
                valueMm={Number(value)}
                name={axis === 'width' ? 'Largeur intérieure de la case' : 'Hauteur intérieure de la case'}
                onCommit={axis === 'width' ? edit.onWidth : edit.onHeight}
                onDark={onDark}
                className={`px-px ${glow}`}
                dimension={axis}
            >
                {value}
            </PlanValue>
        );
    };
    return (
        <span
            className={`whitespace-nowrap text-center font-mono leading-tight ${highlight && parts ? 'opacity-100' : 'opacity-80'}`}
            style={{ fontSize: size }}
        >
            {parts ? (
                <>
                    {number('height', parts.height)}
                    {parts.separator}
                    {number('width', parts.width)}
                    {parts.suffix}
                </>
            ) : (
                text
            )}
        </span>
    );
}

// Hauteur (mm) du socle quand il est actif
const PLINTH_HEIGHT_MM = PLINTH_HEIGHT_M * 1000;

// Parties que le plan affiche sans les régler : la raison s'affiche au double-clic
const LOCKED_REASONS: Record<NonNullable<ChainSegment['locked']>, string> = {
    rounded: "La largeur d'un arrondi se choisit à l'étape Base & bords.",
    socle: `Le socle mesure toujours ${PLINTH_HEIGHT_MM} mm de haut.`,
};

// Cotes saisies dans le plan. Absent : le plan se lit seulement (consultation, récapitulatif)
export interface PlanDimensionEditing {
    // Taille intérieure d'une zone (case, colonne, niveau), comme affichée dans le plan
    onResizeZone: (zoneId: string, axis: DimensionAxis, interiorMm: number) => void;
    // Cote extérieure du meuble (largeur totale, hauteur totale, profondeur)
    onFurnitureDimensionChange: (key: DimensionKey, valueMm: number) => void;
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
        case 'sliding_door': return DOOR_VISUAL(ArrowLeftRight);
        case 'push_door':
        case 'push_door_right': return DOOR_VISUAL(Hand);
        case 'mirror_door':
        case 'mirror_door_right': return GLASS_VISUAL(Sparkles);
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
    // Une zone parente est sélectionnée (caisson, étagère) : ses cases éclairent aussi la cote réglée
    insideSelection?: boolean;
    // Cotes des cases modifiables au double-clic
    editing?: PlanDimensionEditing;
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
                      insideSelection = false,
                      editing,
                  }: ZoneNodeProps) {
    const isSelected = selectedZoneIds.includes(zone.id);
    const activeDimension = useActiveDimension();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    const handleClick = (event: SyntheticEvent) => {
        event.stopPropagation();
        onSelect(zone.id, false);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        // Touche venue d'un nombre de la case (saisie de cote) : ce n'est pas une sélection
        if (event.target !== event.currentTarget) return;
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
        setActiveDimension(dimensionForDivider(zone.type));
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
        setActiveDimension(null);
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

        // Une div plutôt qu'un bouton : les nombres de la case sont eux-mêmes cliquables (saisie de cote)
        return (
            <div
                role="button"
                tabIndex={0}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                title={description}
                aria-label={description}
                className={`relative flex h-full w-full cursor-pointer select-none flex-col items-center justify-center gap-px overflow-hidden border-2 transition-all duration-200 ${
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
                            <LeafDims
                                text={layout.dims.text}
                                size={layout.dims.size}
                                highlight={isSelected || insideSelection ? activeAxis(activeDimension, 'zone') : null}
                                onDark={isSelected}
                                edit={
                                    editing && {
                                        onHeight: (valueMm) => editing.onResizeZone(zone.id, 'height', valueMm),
                                        onWidth: (valueMm) => editing.onResizeZone(zone.id, 'width', valueMm),
                                    }
                                }
                            />
                        )}
                    </>
                )}
            </div>
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
                            insideSelection={insideSelection || isSelected}
                            editing={editing}
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
    // Profondeur du meuble : affichée en tête du plan (vue de face, elle n'a pas de ligne de cote)
    depth?: number;
    // Cotes modifiables au double-clic. Absent : plan en lecture seule
    editing?: PlanDimensionEditing;
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
                                       depth,
                                       editing,
                                   }: ZoneCanvasProps) {
                                       const canvasContainerRef = useRef<HTMLDivElement>(null);
                                       const [availableWidth, setAvailableWidth] = useState<number | null>(null);
    // Largeur ou hauteur du meuble en cours de réglage (étape Dimensions) : sa ligne de cote s'éclaire
    const furnitureAxis = activeAxis(useActiveDimension(), 'furniture');
    // Largeur déclarée d'origine (bords arrondis compris) : `width` reçu ici est déjà réduit des
    // extensions actives (voir getUsableWidthMm). On reconstruit le total pour que la ligne de cote et
    // la mise à l'échelle portent sur l'enveloppe complète, comme `height` le fait déjà pour le socle.
    const leftMm = roundedLeft ? roundedLeftWidthMm : 0;
    const rightMm = roundedRight ? roundedRightWidthMm : 0;
    const declaredWidthMm = width + leftMm + rightMm;

    // Chaînes de cotes entre la cote générale et le plan : colonnes en haut, niveaux sur le côté, avec les
    // arrondis et le socle. Seulement quand elles apportent plus qu'une seule mesure.
    const frame: PlanFrame = { usableWidthMm: width, heightMm: height, hasSocle, roundedWidthMm: leftMm + rightMm };
    const widthChain = planChain(zone, 'width', frame, { leftMm, rightMm });
    const heightChain = planChain(zone, 'height', frame);
    const showWidthChain = widthChain.length >= 2;
    const showHeightChain = heightChain.length >= 2;
    const topGutter = DIMENSION_GUTTER_PX + (showWidthChain ? CHAIN_GUTTER_PX : 0);
    const sideGutter = DIMENSION_GUTTER_PX + (showHeightChain ? CHAIN_GUTTER_PX : 0);

    // Calcul du ratio réel du meuble (identique au modèle 3D), dans la boîte disponible. La boîte
    // réserve en plus la place des lignes de cote (gutter) pour que l'ensemble tienne dans l'espace alloué.
    const aspectRatio = declaredWidthMm / height;
    const boxWidth = availableWidth === null ? 500 : Math.max(1, Math.min(availableWidth - 32, MAX_CANVAS_WIDTH));
    const boxHeight = Math.max(1, maxCanvasHeight);
    const drawableWidth = Math.max(1, boxWidth - sideGutter);
    const drawableHeight = Math.max(1, boxHeight - topGutter);

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

    const chainItems = (segments: ChainSegment[], axis: DimensionAxis): ChainItem[] =>
        segments.map((segment) => {
            const zoneId = segment.zoneId;
            return {
                key: segment.key,
                startPx: segment.startMm * mmToPx,
                endPx: segment.endMm * mmToPx,
                valueMm: segment.valueMm,
                name: segment.name,
                onCommit: editing && zoneId ? (valueMm: number) => editing.onResizeZone(zoneId, axis, valueMm) : undefined,
                lockedReason: editing && segment.locked ? LOCKED_REASONS[segment.locked] : undefined,
            };
        });

    // Nombres des bandes (arrondis, socle) : la hauteur et la largeur du meuble s'y règlent aussi
    const changeFurniture = (key: DimensionKey) =>
        editing ? (valueMm: number) => editing.onFurnitureDimensionChange(key, valueMm) : undefined;
    const bandValue = (valueMm: number, name: string, onCommit?: (valueMm: number) => void, lockedReason?: string) => (
        <PlanValue
            valueMm={Math.round(valueMm)}
            name={name}
            onCommit={onCommit}
            lockedReason={editing ? lockedReason : undefined}
            isolateClicks
            className="px-px"
        />
    );
    const plinthMm = hasSocle ? PLINTH_HEIGHT_MM : 0;
    const roundedBand = (side: 'left' | 'right', widthMm: number, canvasWidthPx: number) => (
        <div
            className="flex flex-col items-center justify-center gap-0.5 overflow-hidden border border-black/15 bg-am-mist/50"
            style={{ width: canvasWidthPx, height: carcassCanvasHeight }}
            title={`Bord ${side === 'left' ? 'gauche' : 'droit'} arrondi : ${Math.round(widthMm)} mm`}
        >
            <span className="whitespace-nowrap font-semibold leading-tight text-black/65" style={{ fontSize: 18 }}>
                Arrondis
            </span>
            <span className="whitespace-nowrap font-mono text-[10px] text-black/65">
                {bandValue(
                    sideHeightMm,
                    'Hauteur du caisson',
                    editing ? (valueMm) => editing.onFurnitureDimensionChange('height', valueMm + plinthMm) : undefined
                )}
                {' × '}
                {bandValue(widthMm, `Largeur de l'arrondi ${side === 'left' ? 'gauche' : 'droit'}`, undefined, LOCKED_REASONS.rounded)}
                {' mm'}
            </span>
        </div>
    );

    return (
        <div className="border border-black/10 bg-white p-5" style={{ borderRadius: '4px' }}>
            {/* En-tête : la profondeur, seule mesure que le plan vu de face ne peut pas coter */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-black">Plan du meuble</h3>
                {depth !== undefined && (
                    <span className="flex items-center gap-1 text-xs text-black/65">
                        Profondeur
                        <PlanValue
                            valueMm={Math.round(depth)}
                            name="Profondeur du meuble"
                            onCommit={changeFurniture('depth')}
                            className="px-1 py-px font-mono font-semibold text-black"
                        >
                            {Math.round(depth)} mm
                        </PlanValue>
                    </span>
                )}
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
                    {/* Cote de largeur : alignée sur le plan, décalée des gouttières réservées aux cotes de hauteur.
                        Porte la largeur totale déclarée, bords arrondis compris. */}
                    <div className="flex" style={{ paddingLeft: sideGutter }}>
                        <DimensionLine
                            orientation="horizontal"
                            length={canvasWidth}
                            valueMm={Math.round(declaredWidthMm)}
                            name="Largeur du meuble"
                            highlighted={furnitureAxis === 'width'}
                            onCommit={changeFurniture('width')}
                        />
                    </div>
                    {showWidthChain && (
                        <div className="flex" style={{ paddingLeft: sideGutter }}>
                            <DimensionChain orientation="horizontal" length={canvasWidth} items={chainItems(widthChain, 'width')} />
                        </div>
                    )}
                    <div className="flex">
                        <DimensionLine
                            orientation="vertical"
                            length={canvasHeight}
                            valueMm={Math.round(height)}
                            name="Hauteur du meuble"
                            highlighted={furnitureAxis === 'height'}
                            onCommit={changeFurniture('height')}
                        />
                        {showHeightChain && (
                            <DimensionChain orientation="vertical" length={canvasHeight} items={chainItems(heightChain, 'height')} />
                        )}
                        <div className="flex flex-col">
                            {/* Caisson, flanqué des bandes de bord arrondi actives : même principe que le socle,
                                juste des rectangles à l'échelle, de part et d'autre plutôt qu'en dessous */}
                            <div className="flex" style={{ height: carcassCanvasHeight }}>
                                {roundedLeft && roundedBand('left', roundedLeftWidthMm, roundedLeftCanvasWidth)}
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
                                        editing={editing}
                                    />
                                </div>
                                {roundedRight && roundedBand('right', roundedRightWidthMm, roundedRightCanvasWidth)}
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
                                        {bandValue(PLINTH_HEIGHT_MM, 'Hauteur du socle', undefined, LOCKED_REASONS.socle)}
                                        {' × '}
                                        {bandValue(declaredWidthMm, 'Largeur du meuble', changeFurniture('width'))}
                                        {' mm'}
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
            {editing && !showNumbers && (
                <p className="mt-1 flex items-center justify-center gap-1.5 text-center text-sm text-black/65">
                    <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="pointer-coarse:hidden">Double-cliquez sur une mesure pour la changer</span>
                    <span className="hidden pointer-coarse:inline">Touchez deux fois une mesure pour la changer</span>
                </p>
            )}
        </div>
    );
}