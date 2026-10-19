import React, { Suspense, useMemo, useRef, useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Canvas, useThree, RootState, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Float, useTexture } from '@react-three/drei';
import * as THREE from 'three';

import { Zone, PanelId, panelIdToString } from './ZoneEditor/types';
import { ComponentColors } from './MaterialSelector';
import type { ThreeCanvasHandle } from './types';
import { getSafeColor, getHingeYPositions } from './scene/utils';
import { TexturedMaterial } from './scene/TexturedMaterial';
import { PanelSegmentHitbox, StructuralPanel, Handle, DoorHinge } from './scene/StructuralElements';
import { AnimatedDoor, AnimatedMirrorDoor, AnimatedPushDoor } from './scene/AnimatedDoors';
import { AnimatedPushDrawer, AnimatedDrawer } from './scene/AnimatedDrawers';
import { BackPanelWithOpenings } from './scene/BackPanel';
import { JapaneseMinimalist, ScandinavianLandscape, BauhausGeometric, WallClock } from './scene/wall-art';
import { Room, HumanSilhouette } from './scene/Room';
import { Books, Plant, Vase, Lamp, CompartmentLight, CableHole, ShelfDecoration } from './scene/Decor';
import { ScreenshotCapture } from './scene/ScreenshotCapture';
import { ZoneHighlights } from './scene/ZoneHighlights';
import { ZoneHoverTag } from './scene/ZoneHoverTag';
import { CameraRig, type CameraApi } from './scene/CameraRig';
import { CameraToolbar } from './scene/CameraToolbar';
import { createDoubleClickDetector, isRealClick } from './scene/pointer';
import { DividerHandles, type DividerChange } from './scene/DividerHandles';
import { getFurnitureBox, getFurnitureLayout, getZoneBox, unionBoxes, type Box } from '@/lib/configurator/zoneBounds';
import { getZoneFacade } from '@/lib/configurator/zoneStats';
import { applySplitRatios } from '@/lib/configurator/zoneResize';

export type { ThreeCanvasHandle };

interface ThreeViewerProps {
    width: number;
    height: number;
    depth: number;
    color: string;
    imageUrl?: string | null;
    hasSocle: boolean;
    socle?: string;
    rootZone: Zone | null;
    selectedZoneIds?: string[];
    // false : la zone sélectionnée n'est soulignée que par un contour, sans voile orangé (choix des couleurs)
    selectionTint?: boolean;
    onSelectZone?: (id: string | null) => void;
    selectedPanelIds?: Set<string>;
    onSelectPanel?: (panelId: string | null) => void;
    deletedPanelIds?: Set<string>;
    isBuffet?: boolean;
    doorsOpen?: boolean;
    showDecorations?: boolean;
    // true : les tiroirs ne sont pas dessinés, on voit mieux les planches derrière
    hideDrawers?: boolean;
    onToggleDoors?: () => void;
    componentColors?: ComponentColors;
    doorType?: 'none' | 'single' | 'double';
    doorSide?: 'left' | 'right';
    useMultiColor?: boolean;
    mountingStyle?: 'applique' | 'encastre';
    onCaptureReady?: (captureFunction: () => string | null) => void;
    // Fourni : les cloisons et étagères portent une poignée qu'on fait glisser, comme dans le plan 2D
    onResizeDivider?: (zoneId: string, ratios: number[]) => void;
}

interface DividerEvents {
    onPreview: (change: DividerChange | null) => void;
    onCommit: (change: DividerChange) => void;
}

function Furniture({
                       width, height, depth, color, imageUrl, hasSocle, socle, rootZone, isBuffet,
                       doorsOpen, showDecorations, hideDrawers = false, onToggleDoors, componentColors,
                       doorType = 'none',
                       doorSide = 'left',
                       useMultiColor = false,
                       mountingStyle = 'applique',
                       selectedZoneIds = [],
                       selectionTint = true,
                       onSelectZone,
                       selectedPanelIds = new Set(),
                       onSelectPanel,
                       deletedPanelIds = new Set(),
                       dividerEvents
                   }: ThreeViewerProps & { dividerEvents?: DividerEvents }) {
    const [openCompartments, setOpenCompartments] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (rootZone) {
            const newOpenStates: Record<string, boolean> = {};
            const applyOpenState = (zone: Zone) => {
                const hasLeafFacade = zone.type === 'leaf' && (zone.content === 'drawer' || zone.content === 'push_drawer' || zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double' || zone.content === 'push_door' || zone.content === 'push_door_right' || zone.content === 'mirror_door' || zone.content === 'mirror_door_right');
                const hasGroupDoor = !!zone.doorContent && zone.doorContent !== 'empty';
                if (hasLeafFacade || hasGroupDoor) {
                    newOpenStates[zone.id] = doorsOpen || false;
                }
                if (zone.children) {
                    zone.children.forEach(applyOpenState);
                }
            };
            applyOpenState(rootZone);
            setOpenCompartments(newOpenStates);
        }
    }, [doorsOpen, rootZone]);

    const toggleCompartment = useCallback((id: string) => {
        setOpenCompartments(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    }, []);
    const layout = useMemo(() => getFurnitureLayout(width, height, depth, hasSocle), [width, height, depth, hasSocle]);
    const { w, h, d, sideHeight, yOffset, thickness, backPanelThickness, compartmentGap, mountingOffset, doorOverlap, doorRecess } = useMemo(() => {
        const { width: w, depth: d, sideHeight, yOffset, thickness } = layout;
        const h = (height || 730) / 1000;
        const backPanelThickness = 0.004;
        const compartmentGap = mountingStyle === 'encastre' ? 0.006 : 0.003;
        const mountingOffset = mountingStyle === 'encastre' ? -0.022 : 0;
        const doorOverlap = mountingStyle === 'encastre' ? 0 : thickness;
        const doorRecess = 0;
        return { w, h, d, sideHeight, yOffset, thickness, backPanelThickness, compartmentGap, mountingOffset, doorOverlap, doorRecess };
    }, [layout, height, mountingStyle]);

    // ── Pointeur : survol, sélection et ouverture des façades ──────────────────
    // Un seul endroit gère le pointeur pour les compartiments, les portes et les tiroirs : ils se
    // comportent tous pareil, et un glissement pour tourner la caméra n'y est jamais pris pour un clic.
    const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
    const doubleClick = useMemo(() => createDoubleClickDetector(), []);

    useEffect(() => () => {
        document.body.style.cursor = 'default';
    }, []);

    const zoneHandlers = useCallback((zoneId: string, openable: boolean) => ({
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            setHoveredZoneId(zoneId);
            document.body.style.cursor = 'pointer';
        },
        onPointerOut: () => {
            setHoveredZoneId((current) => (current === zoneId ? null : current));
            document.body.style.cursor = 'default';
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            if (!isRealClick(e)) return;

            // Consultation : rien à sélectionner, un clic ouvre ou ferme
            if (!onSelectZone) {
                if (openable) toggleCompartment(zoneId);
                return;
            }
            // Édition : un clic sélectionne, un double-clic ouvre ou ferme la porte ou le tiroir
            if (openable && doubleClick.register(zoneId, performance.now())) {
                toggleCompartment(zoneId);
                return;
            }
            onSelectZone(zoneId);
        },
    }), [onSelectZone, toggleCompartment, doubleClick]);

    const DEFAULT_COLOR = '#D8C7A1';

    const baseStructureColor = color || DEFAULT_COLOR;
    const baseStructureImageUrl = imageUrl || null;

    const finalStructureColor = useMemo(() => {
        if (!useMultiColor) return baseStructureColor;
        const hex = componentColors?.structure?.hex;
        return (hex && hex !== '') ? hex : baseStructureColor;
    }, [useMultiColor, componentColors?.structure?.hex, baseStructureColor]);

    const finalStructureImageUrl = useMemo(() => {
        if (!useMultiColor) return baseStructureImageUrl;
        return componentColors?.structure?.imageUrl ?? baseStructureImageUrl;
    }, [useMultiColor, componentColors?.structure?.imageUrl, baseStructureImageUrl]);

    const finalShelfColor = useMemo(() => {
        if (!useMultiColor) return baseStructureColor;
        const hex = componentColors?.shelves?.hex;
        return (hex && hex !== '') ? hex : finalStructureColor;
    }, [useMultiColor, componentColors?.shelves?.hex, baseStructureColor, finalStructureColor]);

    const finalShelfImageUrl = useMemo(() => {
        if (!useMultiColor) return baseStructureImageUrl;
        return componentColors?.shelves?.imageUrl ?? finalStructureImageUrl;
    }, [useMultiColor, componentColors?.shelves?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

    const finalDoorColor = useMemo(() => {
        if (!useMultiColor) return baseStructureColor;
        const hex = componentColors?.doors?.hex;
        return (hex && hex !== '') ? hex : finalStructureColor;
    }, [useMultiColor, componentColors?.doors?.hex, baseStructureColor, finalStructureColor]);

    const finalDoorImageUrl = useMemo(() => {
        if (!useMultiColor) return baseStructureImageUrl;
        return componentColors?.doors?.imageUrl ?? finalStructureImageUrl;
    }, [useMultiColor, componentColors?.doors?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

    const finalBackColor = useMemo(() => {
        if (!useMultiColor) return baseStructureColor;
        const hex = componentColors?.back?.hex;
        return (hex && hex !== '') ? hex : finalStructureColor;
    }, [useMultiColor, componentColors?.back?.hex, baseStructureColor, finalStructureColor]);

    const finalBackImageUrl = useMemo(() => {
        if (!useMultiColor) return baseStructureImageUrl;
        return componentColors?.back?.imageUrl ?? finalStructureImageUrl;
    }, [useMultiColor, componentColors?.back?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

    const finalDrawerColor = useMemo(() => {
        if (!useMultiColor) return baseStructureColor;
        const hex = componentColors?.drawers?.hex;
        return (hex && hex !== '') ? hex : finalStructureColor;
    }, [useMultiColor, componentColors?.drawers?.hex, baseStructureColor, finalStructureColor]);

    const finalDrawerImageUrl = useMemo(() => {
        if (!useMultiColor) return baseStructureImageUrl;
        return componentColors?.drawers?.imageUrl ?? finalStructureImageUrl;
    }, [useMultiColor, componentColors?.drawers?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

    const finalBaseColor = useMemo(() => {
        if (!useMultiColor) return baseStructureColor;
        const hex = componentColors?.base?.hex;
        return (hex && hex !== '') ? hex : finalStructureColor;
    }, [useMultiColor, componentColors?.base?.hex, baseStructureColor, finalStructureColor]);

    const finalBaseImageUrl = useMemo(() => {
        if (!useMultiColor) return baseStructureImageUrl;
        return componentColors?.base?.imageUrl ?? finalStructureImageUrl;
    }, [useMultiColor, componentColors?.base?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

    const separatorColor = finalStructureColor;
    const separatorImageUrl = finalStructureImageUrl;

    const hasZoneSpecificDoors = useMemo(() => {
        if (!rootZone) return false;

        const checkZone = (zone: Zone): boolean => {
            if (zone.type === 'leaf' && (zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double' || zone.content === 'push_door' || zone.content === 'push_door_right' || zone.content === 'mirror_door' || zone.content === 'mirror_door_right')) {
                return true;
            }
            if (zone.children) {
                return zone.children.some(child => checkZone(child));
            }
            return false;
        };

        return checkZone(rootZone);
    }, [rootZone]);

    const openSpaceInfo = useMemo(() => {
        const openSpaces: { x: number; y: number; width: number; height: number }[] = [];
        if (!rootZone) return openSpaces;

        const collectOpenSpaces = (zone: Zone, x: number, y: number, width: number, height: number) => {
            if (zone.type === 'leaf' && zone.isOpenSpace) {
                openSpaces.push({ x, y, width, height });
                return;
            }

            if (zone.children && zone.children.length > 0) {
                let currentPos = 0;
                zone.children.forEach((child, i) => {
                    let ratio: number;
                    if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
                        ratio = zone.splitRatios[i] / 100;
                    } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
                        ratio = (i === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
                    } else {
                        ratio = 1 / zone.children!.length;
                    }

                    // ANCIEN CODE (bug : n'enlevais pas l'épaisseur des séparateurs entre
                    // compartiments) :
                    //
                    // if (zone.type === 'horizontal') {
                    //     const childHeight = height * ratio;
                    //     collectOpenSpaces(child, x, (y + height/2) - currentPos - childHeight/2, width, childHeight);
                    //     currentPos += childHeight;
                    // } else {
                    //     const childWidth = width * ratio;
                    //     collectOpenSpaces(child, x - width/2 + currentPos + childWidth/2, y, childWidth, height);
                    //     currentPos += childWidth;
                    // }

                    const numSeparators = zone.children!.length - 1;

                    if (zone.type === 'horizontal') {
                        const availableHeight = height - numSeparators * thickness;
                        const childHeight = availableHeight * ratio;
                        collectOpenSpaces(child, x, (y + height/2) - currentPos - childHeight/2, width, childHeight);
                        currentPos += childHeight;
                        if (i < zone.children!.length - 1) currentPos += thickness;
                    } else {
                        const availableWidth = width - numSeparators * thickness;
                        const childWidth = availableWidth * ratio;
                        collectOpenSpaces(child, x - width/2 + currentPos + childWidth/2, y, childWidth, height);
                        currentPos += childWidth;
                        if (i < zone.children!.length - 1) currentPos += thickness;
                    }
                });
            }
        };

        collectOpenSpaces(rootZone, 0, sideHeight/2 + yOffset, w - (thickness * 2), sideHeight - (thickness * 2));
        return openSpaces;
    }, [rootZone, w, sideHeight, yOffset, thickness]);

    interface PanelSegment {
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }

    interface BackPanelSegment extends PanelSegment {
        colIndex: number;
        rowIndex: number;
    }

    interface SeparatorSegment extends PanelSegment {
        orientation: 'vertical' | 'horizontal';
        segmentIndex: number;
        behindDoor?: boolean;
    }

    const panelSegments = useMemo(() => {
        const topSegments: PanelSegment[] = [];
        const bottomSegments: PanelSegment[] = [];
        const leftSegments: PanelSegment[] = [];
        const rightSegments: PanelSegment[] = [];
        const backSegments: BackPanelSegment[] = [];
        const separatorSegments: SeparatorSegment[] = [];

        const innerWidth = w - (thickness * 2);
        const innerHeight = sideHeight - (thickness * 2);

        if (!rootZone) {
            topSegments.push({ id: 'panel-top-0', x: 0, y: h - thickness/2, width: w, height: thickness });
            bottomSegments.push({ id: 'panel-bottom-0', x: 0, y: yOffset + thickness/2, width: w, height: thickness });
            leftSegments.push({ id: 'panel-left-0', x: -w/2 + thickness/2, y: sideHeight/2 + yOffset, width: thickness, height: sideHeight });
            rightSegments.push({ id: 'panel-right-0', x: w/2 - thickness/2, y: sideHeight/2 + yOffset, width: thickness, height: sideHeight });
            backSegments.push({ id: 'panel-back-0-0', x: 0, y: sideHeight/2 + yOffset, width: w - 0.01, height: sideHeight - 0.01, colIndex: 0, rowIndex: 0 });
            return { topSegments, bottomSegments, leftSegments, rightSegments, backSegments, separatorSegments };
        }

        interface GridCell {
            x: number;
            y: number;
            width: number;
            height: number;
            colPath: number[];
            rowPath: number[];
            zone: Zone;
        }

        const collectGridCells = (
            zone: Zone,
            x: number,
            y: number,
            width: number,
            height: number,
            colPath: number[] = [],
            rowPath: number[] = []
        ): GridCell[] => {
            if (zone.type === 'leaf' || !zone.children || zone.children.length === 0) {
                return [{ x, y, width, height, colPath, rowPath, zone }];
            }

            const cells: GridCell[] = [];

            if (zone.type === 'vertical') {
                const numSeparators = zone.children.length - 1;
                const availableWidth = width - (numSeparators * thickness);
                let currentX = x - width / 2;

                zone.children.forEach((child, i) => {
                    let ratio: number;
                    if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
                        ratio = zone.splitRatios[i] / 100;
                    } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
                        ratio = (i === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
                    } else {
                        ratio = 1 / zone.children!.length;
                    }

                    const colWidth = availableWidth * ratio;
                    const childCells = collectGridCells(
                        child,
                        currentX + colWidth / 2,
                        y,
                        colWidth,
                        height,
                        [...colPath, i],
                        rowPath
                    );
                    cells.push(...childCells);
                    currentX += colWidth;
                    if (i < zone.children!.length - 1) {
                        currentX += thickness;
                    }
                });
            } else if (zone.type === 'horizontal') {
                const numSeparators = zone.children.length - 1;
                const availableHeight = height - (numSeparators * thickness);
                let currentY = y + height / 2;

                zone.children.forEach((child, i) => {
                    let ratio: number;
                    if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
                        ratio = zone.splitRatios[i] / 100;
                    } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
                        ratio = (i === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
                    } else {
                        ratio = 1 / zone.children!.length;
                    }

                    const rowHeight = availableHeight * ratio;
                    const childCells = collectGridCells(
                        child,
                        x,
                        currentY - rowHeight / 2,
                        width,
                        rowHeight,
                        colPath,
                        [...rowPath, i]
                    );
                    cells.push(...childCells);
                    currentY -= rowHeight;
                    if (i < zone.children!.length - 1) {
                        currentY -= thickness;
                    }
                });
            }

            return cells;
        };

        interface SeparatorInfo {
            x: number;
            y: number;
            width: number;
            height: number;
            orientation: 'vertical' | 'horizontal';
            path: string;
            behindDoor: boolean;
        }

        const collectSeparators = (
            zone: Zone,
            x: number,
            y: number,
            width: number,
            height: number,
            path: string = '',
            hasDoorAbove: boolean = false
        ): SeparatorInfo[] => {
            const separators: SeparatorInfo[] = [];

            if (!zone.children || zone.children.length === 0) {
                return separators;
            }

            if (zone.children.length === 1) {
                const child = zone.children[0];
                const zoneDoor = zone.doorContent || zone.content;
                const childHasDoor = hasDoorAbove || !!(zoneDoor && typeof zoneDoor === 'string' && zoneDoor.includes('door'));
                const childSeparators = collectSeparators(
                    child,
                    x,
                    y,
                    width,
                    height,
                    `${path}c0-`,
                    childHasDoor
                );
                separators.push(...childSeparators);
                return separators;
            }

            const zoneDoor = zone.doorContent || zone.content;
            const currentHasDoor = hasDoorAbove || !!(zoneDoor && typeof zoneDoor === 'string' && zoneDoor.includes('door'));

            if (zone.type === 'vertical') {
                const numSeparators = zone.children.length - 1;
                const availableWidth = width - (numSeparators * thickness);
                let currentX = x - width / 2;

                zone.children.forEach((child, i) => {
                    let ratio: number;
                    if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
                        ratio = zone.splitRatios[i] / 100;
                    } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
                        ratio = (i === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
                    } else {
                        ratio = 1 / zone.children!.length;
                    }

                    const colWidth = availableWidth * ratio;

                    if (i < zone.children!.length - 1) {
                        separators.push({
                            x: currentX + colWidth + thickness / 2,
                            y: y,
                            width: thickness,
                            height: height,
                            orientation: 'vertical',
                            path: `${path}v${i}`,
                            behindDoor: currentHasDoor
                        });
                    }

                    const childSeparators = collectSeparators(
                        child,
                        currentX + colWidth / 2,
                        y,
                        colWidth,
                        height,
                        `${path}c${i}-`,
                        currentHasDoor
                    );
                    separators.push(...childSeparators);

                    currentX += colWidth;
                    if (i < zone.children!.length - 1) {
                        currentX += thickness;
                    }
                });
            } else if (zone.type === 'horizontal') {
                const numSeparators = zone.children.length - 1;
                const availableHeight = height - (numSeparators * thickness);
                let currentY = y + height / 2;

                zone.children.forEach((child, i) => {
                    let ratio: number;
                    if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
                        ratio = zone.splitRatios[i] / 100;
                    } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
                        ratio = (i === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
                    } else {
                        ratio = 1 / zone.children!.length;
                    }

                    const rowHeight = availableHeight * ratio;

                    if (i < zone.children!.length - 1) {
                        const sepY = currentY - rowHeight - thickness / 2;
                        separators.push({
                            x: x,
                            y: sepY,
                            width: width,
                            height: thickness,
                            orientation: 'horizontal',
                            path: `${path}h${i}`,
                            behindDoor: currentHasDoor
                        });
                    }

                    const childSeparators = collectSeparators(
                        child,
                        x,
                        currentY - rowHeight / 2,
                        width,
                        rowHeight,
                        `${path}r${i}-`,
                        currentHasDoor
                    );
                    separators.push(...childSeparators);

                    currentY -= rowHeight;
                    if (i < zone.children!.length - 1) {
                        currentY -= thickness;
                    }
                });
            }

            return separators;
        };

        const allCells = collectGridCells(
            rootZone,
            0,
            sideHeight / 2 + yOffset,
            innerWidth,
            innerHeight
        );

        const allSeparators = collectSeparators(
            rootZone,
            0,
            sideHeight / 2 + yOffset,
            innerWidth,
            innerHeight
        );

        const furnitureBottomInner = yOffset + thickness;
        const furnitureTopInner = yOffset + sideHeight - thickness;

        const minCellY = Math.min(...allCells.map(c => c.y - c.height / 2));
        const maxCellY = Math.max(...allCells.map(c => c.y + c.height / 2));
        const minCellX = Math.min(...allCells.map(c => c.x - c.width / 2));
        const maxCellX = Math.max(...allCells.map(c => c.x + c.width / 2));

        allCells.forEach((cell, i) => {
            let segX = cell.x;
            let segY = cell.y;
            let segWidth = cell.width;
            let segHeight = cell.height;

            const cellBottom = cell.y - cell.height / 2;
            const cellTop = cell.y + cell.height / 2;
            const cellLeft = cell.x - cell.width / 2;
            const cellRight = cell.x + cell.width / 2;

            const isLeftmost = cellLeft <= minCellX + 0.01;
            const isRightmost = cellRight >= maxCellX - 0.01;
            const isTopmost = cellTop >= maxCellY - 0.01;
            const isBottommost = cellBottom <= minCellY + 0.01;

            const touchesFurnitureBottom = cellBottom <= furnitureBottomInner + 0.05;
            const touchesFurnitureTop = cellTop >= furnitureTopInner - 0.05;

            if (isLeftmost) {
                segWidth += thickness;
                segX -= thickness / 2;
            }
            if (isRightmost) {
                segWidth += thickness;
                segX += thickness / 2;
            }
            if (isTopmost || touchesFurnitureTop) {
                segHeight += thickness;
                segY += thickness / 2;
            }
            if (isBottommost || touchesFurnitureBottom) {
                const gapToBottom = cellBottom - yOffset;
                const extensionBottom = Math.max(thickness, gapToBottom + 0.001);
                segHeight += extensionBottom;
                segY -= extensionBottom / 2;
            }

            const colIndex = cell.colPath.length > 0 ? cell.colPath[0] : 0;
            const rowIndex = cell.rowPath.length > 0 ? cell.rowPath[0] : 0;

            const pathId = `c${cell.colPath.join('_')}-r${cell.rowPath.join('_')}`;

            backSegments.push({
                id: `panel-back-${pathId}`,
                x: segX,
                y: segY,
                width: segWidth,
                height: segHeight,
                colIndex,
                rowIndex
            });
        });

        console.log('ThreeCanvas - Back panel IDs:', allCells.map((cell) => {
            const pathId = `c${cell.colPath.join('_')}-r${cell.rowPath.join('_')}`;
            return `panel-back-${pathId}`;
        }));

        const maxY = Math.max(...allCells.map(c => c.y + c.height / 2));
        const topTouchingCells = allCells.filter(cell =>
            cell.y + cell.height / 2 >= maxY - 0.05
        );

        const uniqueTopColumns = new Map<number, GridCell[]>();
        topTouchingCells.forEach(cell => {
            const key = Math.round(cell.x * 1000);
            if (!uniqueTopColumns.has(key)) {
                uniqueTopColumns.set(key, []);
            }
            uniqueTopColumns.get(key)!.push(cell);
        });

        const sortedTopColumns = Array.from(uniqueTopColumns.entries())
            .sort(([keyA], [keyB]) => keyA - keyB);

        // Désactivé : le dessus du meuble ne doit jamais être coupé par une cloison qui le
        // touche — règle du configurateur : c'est une seule pièce, de haut en bas comme de
        // bout en bout, rien ne la traverse. Même correctif que pour l'étagère/la cloison.
        // (ancien comportement, gardé au cas où : `if (sortedTopColumns.length > 1) {`)
        if (false && sortedTopColumns.length > 1) {
            sortedTopColumns.forEach(([, cells], index) => {
                const cell = cells[0];
                const isLeftmost = index === 0;
                const isRightmost = index === sortedTopColumns.length - 1;

                let segX = cell.x;
                let segWidth = cell.width;

                if (isLeftmost) {
                    segWidth += thickness;
                    segX -= thickness / 2;
                }
                if (isRightmost) {
                    segWidth += thickness;
                    segX += thickness / 2;
                }

                topSegments.push({
                    id: `panel-top-${index}`,
                    x: segX,
                    y: h - thickness / 2,
                    width: segWidth,
                    height: thickness
                });
            });
        } else {
            topSegments.push({
                id: 'panel-top-0',
                x: 0,
                y: h - thickness / 2,
                width: w,
                height: thickness
            });
        }

        const minY = Math.min(...allCells.map(c => c.y - c.height / 2));
        const bottomTouchingCells = allCells.filter(cell =>
            cell.y - cell.height / 2 <= minY + 0.05
        );

        const uniqueBottomColumns = new Map<number, GridCell[]>();
        bottomTouchingCells.forEach(cell => {
            const key = Math.round(cell.x * 1000);
            if (!uniqueBottomColumns.has(key)) {
                uniqueBottomColumns.set(key, []);
            }
            uniqueBottomColumns.get(key)!.push(cell);
        });

        const sortedBottomColumns = Array.from(uniqueBottomColumns.entries())
            .sort(([keyA], [keyB]) => keyA - keyB);

        // Désactivé : même raison que pour le dessus, voir plus haut.
        // (ancien comportement, gardé au cas où : `if (sortedBottomColumns.length > 1) {`)
        if (false && sortedBottomColumns.length > 1) {
            sortedBottomColumns.forEach(([, cells], index) => {
                const cell = cells[0];
                const isLeftmost = index === 0;
                const isRightmost = index === sortedBottomColumns.length - 1;

                let segX = cell.x;
                let segWidth = cell.width;

                if (isLeftmost) {
                    segWidth += thickness;
                    segX -= thickness / 2;
                }
                if (isRightmost) {
                    segWidth += thickness;
                    segX += thickness / 2;
                }

                bottomSegments.push({
                    id: `panel-bottom-${index}`,
                    x: segX,
                    y: yOffset + thickness / 2,
                    width: segWidth,
                    height: thickness
                });
            });
        } else {
            bottomSegments.push({
                id: 'panel-bottom-0',
                x: 0,
                y: yOffset + thickness / 2,
                width: w,
                height: thickness
            });
        }

        console.log('🔵 BOTTOM PANEL DEBUG:', {
            allCellsCount: allCells.length,
            allCellsX: allCells.map(c => ({ x: c.x.toFixed(4), y: c.y.toFixed(4), bottom: (c.y - c.height/2).toFixed(4) })),
            minY: minY.toFixed(4),
            bottomTouchingCells: bottomTouchingCells.map(c => ({ x: c.x.toFixed(4), key: Math.round(c.x * 1000) })),
            uniqueKeys: Array.from(uniqueBottomColumns.keys()),
            sortedBottomColumnsLength: sortedBottomColumns.length,
            bottomSegments: bottomSegments.map(s => ({ id: s.id, x: s.x.toFixed(4), width: s.width.toFixed(4) }))
        });

        const uniqueLeftRows = new Map<number, GridCell[]>();
        const leftCells = allCells.filter(cell =>
            cell.x - cell.width / 2 <= -innerWidth / 2 + 0.05
        );
        leftCells.forEach(cell => {
            const key = Math.round(cell.y * 1000);
            if (!uniqueLeftRows.has(key)) {
                uniqueLeftRows.set(key, []);
            }
            uniqueLeftRows.get(key)!.push(cell);
        });

        // Montant latéral découpé par rangée : chaque morceau couvre aussi la moitié de l'étagère qui le sépare
        // de ses voisins (sinon un vide de l'épaisseur d'une planche apparaît entre deux morceaux)
        const sideSegmentBounds = (rows: GridCell[]) =>
            rows.map((cell, index) => {
                const cellTop = cell.y + cell.height / 2;
                const cellBottom = cell.y - cell.height / 2;
                const above = rows[index - 1];
                const below = rows[index + 1];
                const top = above ? (cellTop + (above.y - above.height / 2)) / 2 : cellTop + thickness;
                const bottom = below
                    ? (cellBottom + (below.y + below.height / 2)) / 2
                    : cellBottom - Math.max(thickness, cellBottom - yOffset + 0.001);
                return { y: (top + bottom) / 2, height: top - bottom };
            });

        const sortedLeftRows = Array.from(uniqueLeftRows.entries())
            .sort(([keyA], [keyB]) => keyB - keyA);

        if (sortedLeftRows.length > 1) {
            sideSegmentBounds(sortedLeftRows.map(([, cells]) => cells[0])).forEach(({ y, height }, index) => {
                leftSegments.push({
                    id: `panel-left-${index}`,
                    x: -w / 2 + thickness / 2,
                    y,
                    width: thickness,
                    height
                });
            });
        } else {
            leftSegments.push({
                id: 'panel-left-0',
                x: -w / 2 + thickness / 2,
                y: sideHeight / 2 + yOffset,
                width: thickness,
                height: sideHeight
            });
        }

        const uniqueRightRows = new Map<number, GridCell[]>();
        const rightCells = allCells.filter(cell =>
            cell.x + cell.width / 2 >= innerWidth / 2 - 0.05
        );
        rightCells.forEach(cell => {
            const key = Math.round(cell.y * 1000);
            if (!uniqueRightRows.has(key)) {
                uniqueRightRows.set(key, []);
            }
            uniqueRightRows.get(key)!.push(cell);
        });

        const sortedRightRows = Array.from(uniqueRightRows.entries())
            .sort(([keyA], [keyB]) => keyB - keyA);

        if (sortedRightRows.length > 1) {
            sideSegmentBounds(sortedRightRows.map(([, cells]) => cells[0])).forEach(({ y, height }, index) => {
                rightSegments.push({
                    id: `panel-right-${index}`,
                    x: w / 2 - thickness / 2,
                    y,
                    width: thickness,
                    height
                });
            });
        } else {
            rightSegments.push({
                id: 'panel-right-0',
                x: w / 2 - thickness / 2,
                y: sideHeight / 2 + yOffset,
                width: thickness,
                height: sideHeight
            });
        }

        console.log('ThreeCanvas - Separators:', allSeparators.map((sep) =>
            `${sep.orientation === 'vertical' ? 'V' : 'H'}[${sep.path}] at ${sep.orientation === 'vertical' ? `x=${sep.x.toFixed(2)}` : `y=${sep.y.toFixed(2)}`}`
        ));


        allSeparators.forEach((sep, i) => {

            if (sep.orientation === 'vertical') {
                const sepBottom = sep.y - sep.height / 2;
                const sepTop = sep.y + sep.height / 2;
                const sepTouchesFurnitureTop = sepTop >= furnitureTopInner - 0.05;
                const sepTouchesFurnitureBottom = sepBottom <= furnitureBottomInner + 0.05;

                console.log(`Separator ${sep.path}: bottom=${sepBottom.toFixed(4)}, furnitureBottomInner=${furnitureBottomInner.toFixed(4)}, touches=${sepTouchesFurnitureBottom}`);

                const adjacentCells = allCells.filter(cell =>
                    Math.abs((cell.x + cell.width / 2) - (sep.x - thickness / 2)) < 0.05
                );

                console.log(`Separator ${sep.path}: found ${adjacentCells.length} adjacent cells`);

                // Désactivé : une cloison ne doit jamais être redécoupée selon les rangées
                // adjacentes — règle du configurateur : elle va d'une planche à la suivante en
                // un seul morceau, elle n'est jamais fragmentée par ce qui est posé à côté.
                // (ancien comportement, gardé au cas où : `if (adjacentCells.length > 0) {`)
                if (false && adjacentCells.length > 0) {
                    const uniqueRows = new Map<number, GridCell>();
                    adjacentCells.forEach(cell => {
                        const key = Math.round(cell.y * 1000);
                        if (!uniqueRows.has(key)) {
                            uniqueRows.set(key, cell);
                        }
                    });

                    Array.from(uniqueRows.values())
                        .sort((a, b) => b.y - a.y)
                        .forEach((cell, j) => {
                            let segY = sep.y;
                            let segHeight = sep.height;

                            if (sepTouchesFurnitureTop) {
                                const gapToTop = furnitureTopInner - sepTop;
                                const extensionTop = thickness + Math.max(0, gapToTop);
                                segHeight += extensionTop;
                                segY += extensionTop / 2;
                            }
                            if (sepTouchesFurnitureBottom) {
                                const gapToBottom = sepBottom - yOffset;
                                const extensionBottom = Math.max(thickness, gapToBottom + 0.001);
                                segHeight += extensionBottom;
                                segY -= extensionBottom / 2;
                            }

                            console.log(`Sep ${sep.path} segment ${j}: sepBottom=${sepBottom.toFixed(4)}, yOffset=${yOffset.toFixed(4)}, furnitureBottomInner=${furnitureBottomInner.toFixed(4)}, sepTouchesFurnitureBottom=${sepTouchesFurnitureBottom}, height=${segHeight.toFixed(4)}`);

                            separatorSegments.push({
                                id: `separator-v-${sep.path}-${j}`,
                                x: sep.x,
                                y: segY,
                                width: thickness,
                                height: segHeight,
                                orientation: 'vertical',
                                segmentIndex: j,
                                behindDoor: sep.behindDoor
                            });
                        });
                } else {
                    // ANCIEN CODE (même bug que pour les étagères, version verticale : `sep.height`
                    // est déjà exactement la bonne hauteur — collectSeparators la calcule déjà
                    // confinée à sa propre zone, donc elle s'arrête pile à la bonne frontière
                    // (le bas/haut du meuble, ou l'étagère au-dessus/en-dessous). Cette extension
                    // avait un sens avec l'ancien découpage par rangée, mais maintenant que la
                    // cloison est une seule pièce, elle la pousse EN PLUS loin que sa hauteur
                    // réelle -> elle perce la plaque du dessus/dessous) :
                    //
                    // let segY = sep.y;
                    // let segHeight = sep.height;
                    // if (sepTouchesFurnitureTop) {
                    //     const gapToTop = furnitureTopInner - sepTop;
                    //     const extensionTop = thickness + Math.max(0, gapToTop);
                    //     segHeight += extensionTop;
                    //     segY += extensionTop / 2;
                    // }
                    // if (sepTouchesFurnitureBottom) {
                    //     const gapToBottom = sepBottom - yOffset;
                    //     const extensionBottom = Math.max(thickness, gapToBottom + 0.001);
                    //     segHeight += extensionBottom;
                    //     segY -= extensionBottom / 2;
                    // }
                    const segY = sep.y;
                    const segHeight = sep.height;

                    separatorSegments.push({
                        id: `separator-v-${sep.path}-0`,
                        x: sep.x,
                        y: segY,
                        width: thickness,
                        height: segHeight,
                        orientation: 'vertical',
                        segmentIndex: 0,
                        behindDoor: sep.behindDoor
                    });
                }
            } else {
                const furnitureLeftInner = -innerWidth / 2;
                const furnitureRightInner = innerWidth / 2;

                const sepTouchesFurnitureLeft = sep.x - sep.width / 2 <= furnitureLeftInner + 0.05;
                const sepTouchesFurnitureRight = sep.x + sep.width / 2 >= furnitureRightInner - 0.05;

                const adjacentCells = allCells.filter(cell =>
                    Math.abs((cell.y - cell.height / 2) - (sep.y + thickness / 2)) < 0.05
                );

                // Désactivé : une étagère ne doit jamais être redécoupée selon les colonnes de
                // la rangée du dessus — règle du configurateur : une cloison repose SUR
                // l'étagère, elle ne la traverse pas, donc l'étagère reste une seule pièce.
                // (ancien comportement, gardé au cas où : `if (adjacentCells.length > 0) {`)
                if (false && adjacentCells.length > 0) {
                    const uniqueCols = new Map<number, GridCell>();
                    adjacentCells.forEach(cell => {
                        const key = Math.round(cell.x * 1000);
                        if (!uniqueCols.has(key)) {
                            uniqueCols.set(key, cell);
                        }
                    });

                    const sortedCols = Array.from(uniqueCols.values()).sort((a, b) => a.x - b.x);
                    const isSingleColumn = sortedCols.length === 1;

                    sortedCols.forEach((cell, j) => {
                            let segX = cell.x;
                            let segWidth = cell.width;

                            const touchesFurnitureLeft = cell.x - cell.width / 2 <= furnitureLeftInner + 0.01;
                            const touchesFurnitureRight = cell.x + cell.width / 2 >= furnitureRightInner - 0.01;

                            const isFirstInGroup = j === 0;
                            const isLastInGroup = j === sortedCols.length - 1;

                            if (touchesFurnitureLeft || (isSingleColumn && isFirstInGroup)) {
                                segWidth += thickness;
                                segX -= thickness / 2;
                            }
                            if (touchesFurnitureRight || (isSingleColumn && isLastInGroup)) {
                                segWidth += thickness;
                                segX += thickness / 2;
                            }

                            separatorSegments.push({
                                id: `separator-h-${sep.path}-${j}`,
                                x: segX,
                                y: sep.y,
                                width: segWidth,
                                height: thickness,
                                orientation: 'horizontal',
                                segmentIndex: j,
                                behindDoor: sep.behindDoor
                            });
                        });
                } else {
                    // ANCIEN CODE (bug : `sep.width` est déjà exactement la largeur intérieure
                    // correcte — collectSeparators la calcule déjà sans l'épaisseur des côtés.
                    // Cette extension de +thickness avait un sens avec l'ancien découpage par
                    // colonne (chaque morceau était alors trop étroit d'une épaisseur), mais
                    // maintenant que l'étagère est une seule pièce, elle la pousse EN PLUS loin
                    // que la largeur réelle -> elle déborde dans les côtés, uniquement aux
                    // extrémités du meuble puisque sepTouchesFurnitureLeft/Right n'est vrai que là) :
                    //
                    // let segX = sep.x;
                    // let segWidth = sep.width;
                    // if (sepTouchesFurnitureLeft) {
                    //     segWidth += thickness;
                    //     segX -= thickness / 2;
                    // }
                    // if (sepTouchesFurnitureRight) {
                    //     segWidth += thickness;
                    //     segX += thickness / 2;
                    // }
                    const segX = sep.x;
                    const segWidth = sep.width;

                    separatorSegments.push({
                        id: `separator-h-${sep.path}-0`,
                        x: segX,
                        y: sep.y,
                        width: segWidth,
                        height: sep.height,
                        orientation: 'horizontal',
                        segmentIndex: 0,
                        behindDoor: sep.behindDoor
                    });
                }
            }
        });

        console.log('ThreeCanvas - Separator segments:', separatorSegments.map(s => s.id));

        // DEBUG TEMPORAIRE : coordonnées complètes pour chercher le trou dans le fond.
        // Comparer les bords (x ± width/2, y ± height/2) des backSegments entre eux, et avec
        // les x/y/width/height des separatorSegments orientation 'vertical' (les cloisons) —
        // un bord de cloison qui ne couvre pas exactement l'espace laissé par les backSegments
        // voisins est la fuite recherchée.
        console.log('[FIX-v1] backSegments détaillés: ' + JSON.stringify(backSegments.map(s => ({
            id: s.id, x: +s.x.toFixed(4), y: +s.y.toFixed(4), width: +s.width.toFixed(4), height: +s.height.toFixed(4),
        }))));
        console.log('[FIX-v1] separatorSegments détaillés: ' + JSON.stringify(separatorSegments.map(s => ({
            id: s.id, orientation: s.orientation, x: +s.x.toFixed(4), y: +s.y.toFixed(4), width: +s.width.toFixed(4), height: +s.height.toFixed(4),
        }))));

        if (backSegments.length === 0) {
            backSegments.push({ id: 'panel-back-c0-r0', x: 0, y: sideHeight/2 + yOffset, width: w, height: sideHeight, colIndex: 0, rowIndex: 0 });
        }

        console.log('[FIX-v1] leftSegments détaillés: ' + JSON.stringify(leftSegments.map(s => ({
            id: s.id, x: +s.x.toFixed(4), y: +s.y.toFixed(4), width: +s.width.toFixed(4), height: +s.height.toFixed(4),
        }))));
        console.log('[FIX-v1] rightSegments détaillés: ' + JSON.stringify(rightSegments.map(s => ({
            id: s.id, x: +s.x.toFixed(4), y: +s.y.toFixed(4), width: +s.width.toFixed(4), height: +s.height.toFixed(4),
        }))));

        return { topSegments, bottomSegments, leftSegments, rightSegments, backSegments, separatorSegments };
    }, [rootZone, w, h, sideHeight, yOffset, thickness]);


    const elements = useMemo(() => {
        const items: React.ReactNode[] = [];
        if (!rootZone) return items;


        const parseZone = (zone: Zone, x: number, y: number, z: number, width: number, height: number, isAtTop: boolean = true, isAtBottom: boolean = true, hasDoorInFront: boolean = false, isAtLeft: boolean = true, isAtRight: boolean = true) => {
            const topOverlap = isAtTop ? doorOverlap : 0;
            const bottomOverlap = isAtBottom ? doorOverlap : 0;
            const totalDoorOverlap = topOverlap + bottomOverlap;
            const doorYOffset = (topOverlap - bottomOverlap) / 2;
            const leftOverlap = isAtLeft ? doorOverlap : 0;
            const rightOverlap = isAtRight ? doorOverlap : 0;
            const doorZoneWidth = width + leftOverlap + rightOverlap;
            const doorXOffset = (rightOverlap - leftOverlap) / 2;
            if (zone.type === 'leaf') {
                if (zone.isOpenSpace) {
                    items.push(
                        <mesh
                            key={`${zone.id}-hitbox`}
                            position={[x, y, 0]}
                            visible={false}
                            {...zoneHandlers(zone.id, false)}
                        >
                            <boxGeometry args={[width + 0.002, height + 0.002, d + 0.002]} />
                        </mesh>
                    );
                    return;
                }

                if (zone.hasLight) {
                    items.push(
                        <CompartmentLight
                            key={`${zone.id}-light`}
                            width={width}
                            depth={d}
                            position={[x, y + height/2, 0]}
                        />
                    );
                }

                if (zone.hasCableHole) {
                    items.push(
                        <CableHole
                            key={`${zone.id}-cable`}
                            width={width}
                            height={height}
                            depth={d}
                            position={[x, y, 0]}
                        />
                    );
                }

                const hitboxBehindDoor = hasDoorInFront || !!zone.doorContent;
                const hitboxRecess = hitboxBehindDoor ? 0.005 : 0;
                const hitboxDepth = d - hitboxRecess + 0.002;
                const hitboxZ = -hitboxRecess / 2;
                // Les compartiments du bord englobent aussi les panneaux extérieurs : cliquer sur le côté, le
                // dessus ou le dessous du meuble sélectionne le compartiment voisin au lieu de ne rien faire
                const shell = (atEdge: boolean) => (atEdge ? thickness : 0.001);
                const growLeft = shell(isAtLeft);
                const growRight = shell(isAtRight);
                const growTop = shell(isAtTop);
                const growBottom = shell(isAtBottom);
                items.push(
                    <mesh
                        key={`${zone.id}-hitbox`}
                        position={[x + (growRight - growLeft) / 2, y + (growTop - growBottom) / 2, hitboxZ]}
                        visible={false}
                        {...zoneHandlers(zone.id, !!getZoneFacade(zone))}
                    >
                        <boxGeometry args={[width + growLeft + growRight, height + growTop + growBottom, hitboxDepth]} />
                    </mesh>
                );

                if (zone.content === 'shelf') {
                    const behindDoor = hasDoorInFront || !!zone.doorContent;

                    // ANCIEN CODE (bug : profondeur = profondeur TOTALE du meuble (d), donc le
                    // dos de l'étagère va jusqu'au même plan que la face extérieure du panneau
                    // de fond, au lieu de s'arrêter devant lui -> la couleur de l'étagère "sort"
                    // à l'arrière du meuble) :
                    //
                    // const shelfDepth = behindDoor && doorRecess > 0 ? d - doorRecess : d;
                    // const shelfZ = behindDoor && doorRecess > 0 ? z - doorRecess / 2 : z;

                    // On retire l'épaisseur du panneau de fond de la profondeur de l'étagère,
                    // et on avance son centre de la moitié de ce qu'on retire pour garder sa
                    // face avant au même endroit (seule la face arrière recule jusqu'au fond réel).
                    const baseDepth = behindDoor && doorRecess > 0 ? d - doorRecess : d;
                    const baseZ = behindDoor && doorRecess > 0 ? z - doorRecess / 2 : z;
                    const shelfDepth = baseDepth - backPanelThickness;
                    const shelfZ = baseZ + backPanelThickness / 2;
                    items.push(
                        <mesh key={zone.id} position={[x, y, shelfZ]} castShadow receiveShadow>
                            <boxGeometry args={[width, thickness, shelfDepth]} />
                            <TexturedMaterial hexColor={finalShelfColor} imageUrl={finalShelfImageUrl} />
                        </mesh>
                    );
                    if (showDecorations) {
                        items.push(
                            <group key={`${zone.id}-deco`} position={[x, y + thickness/2, shelfZ]}>
                                <ShelfDecoration width={width} height={height} depth={shelfDepth} seed={zone.id} />
                            </group>
                        );
                    }
                } else if (zone.content === 'drawer' && !hideDrawers) {
                    const drawerHexColor = zone.zoneColor?.hex || finalDrawerColor;
                    const drawerImageUrl = zone.zoneColor?.imageUrl !== undefined ? zone.zoneColor.imageUrl : finalDrawerImageUrl;
                    items.push(
                        <group key={zone.id} {...zoneHandlers(zone.id, true)}>
                            <AnimatedDrawer
                            position={[x + doorXOffset, y + doorYOffset, d / 2 + mountingOffset + 0.009]}
                            width={doorZoneWidth - compartmentGap}
                            height={height - compartmentGap + totalDoorOverlap}
                            depth={d}
                            hexColor={drawerHexColor}
                            imageUrl={drawerImageUrl}
                            handleType={zone.handleType}
                            isOpen={openCompartments[zone.id]}
                            />
                        </group>
                    );
                } else if (zone.content === 'push_drawer' && !hideDrawers) {
                    const drawerHexColor = zone.zoneColor?.hex || finalDrawerColor;
                    const drawerImageUrl = zone.zoneColor?.imageUrl !== undefined ? zone.zoneColor.imageUrl : finalDrawerImageUrl;
                    items.push(
                        <group key={zone.id} {...zoneHandlers(zone.id, true)}>
                            <AnimatedPushDrawer
                            position={[x + doorXOffset, y + doorYOffset, d / 2 + mountingOffset + 0.009]}
                            width={doorZoneWidth - compartmentGap}
                            height={height - compartmentGap + totalDoorOverlap}
                            depth={d}
                            hexColor={drawerHexColor}
                            imageUrl={drawerImageUrl}
                            isOpen={openCompartments[zone.id]}
                            />
                        </group>
                    );
                }

                if (zone.hasDressing || zone.content === 'dressing') {
                    items.push(
                        <mesh key={`${zone.id}-dressing`} position={[x, y + height / 2 - 0.05, z]} rotation={[0, 0, Math.PI / 2]}>
                            <cylinderGeometry args={[0.01, 0.01, width - 0.02, 16]} />
                            <meshStandardMaterial color="#aaa" metalness={0.9} />
                        </mesh>
                    );
                }

                const doorToRender = zone.doorContent || (zone.type === 'leaf' && (zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double' || zone.content === 'push_door' || zone.content === 'push_door_right' || zone.content === 'mirror_door' || zone.content === 'mirror_door_right') ? zone.content : null);

                if (doorToRender) {
                    const isDouble = doorToRender === 'door_double';
                    const isRight = doorToRender === 'door_right';
                    const isPush = doorToRender === 'push_door' || doorToRender === 'push_door_right';
                    const isPushRight = doorToRender === 'push_door_right';
                    const isMirror = doorToRender === 'mirror_door' || doorToRender === 'mirror_door_right';
                    const isMirrorRight = doorToRender === 'mirror_door_right';

                    const doorHexColor = zone.zoneColor?.hex || finalDoorColor;
                    const doorImageUrl = zone.zoneColor?.imageUrl !== undefined ? zone.zoneColor.imageUrl : finalDoorImageUrl;

                    if (isMirror) {
                        items.push(
                            <group key={`${zone.id}-door`} {...zoneHandlers(zone.id, true)} position={[x + doorXOffset, y + doorYOffset, d/2 + mountingOffset]}>
                                <AnimatedMirrorDoor
                                    side={isMirrorRight ? "right" : "left"}
                                    position={[isMirrorRight ? (doorZoneWidth/2 - compartmentGap/2) : (-doorZoneWidth/2 + compartmentGap/2), 0, 0]}
                                    width={doorZoneWidth - compartmentGap}
                                    height={height - compartmentGap + totalDoorOverlap}
                                    handleType={zone.handleType}
                                    isOpen={openCompartments[zone.id]}
                                />
                            </group>
                        );
                    } else if (isPush) {
                        items.push(
                            <group key={`${zone.id}-door`} {...zoneHandlers(zone.id, true)} position={[x + doorXOffset, y + doorYOffset, d/2 + mountingOffset]}>
                                <AnimatedPushDoor
                                    side={isPushRight ? "right" : "left"}
                                    position={[isPushRight ? (doorZoneWidth/2 - compartmentGap/2) : (-doorZoneWidth/2 + compartmentGap/2), 0, 0]}
                                    width={doorZoneWidth - compartmentGap}
                                    height={height - compartmentGap + totalDoorOverlap}
                                    hexColor={doorHexColor}
                                    imageUrl={doorImageUrl}
                                    isOpen={openCompartments[zone.id]}
                                />
                            </group>
                        );
                    } else {
                        items.push(
                            <group key={`${zone.id}-door`} {...zoneHandlers(zone.id, true)} position={[x + doorXOffset, y + doorYOffset, d/2 + mountingOffset]}>
                                {(isDouble || !isRight) && (
                                    <AnimatedDoor
                                        side="left"
                                        position={[-doorZoneWidth/2 + compartmentGap/2, 0, 0]}
                                        width={isDouble ? (doorZoneWidth - compartmentGap)/2 : doorZoneWidth - compartmentGap}
                                        height={height - compartmentGap + totalDoorOverlap}
                                        hexColor={doorHexColor}
                                        imageUrl={doorImageUrl}
                                        handleType={zone.handleType}
                                        isOpen={openCompartments[zone.id]}
                                    />
                                )}
                                {(isDouble || isRight) && (
                                    <AnimatedDoor
                                        side="right"
                                        position={[doorZoneWidth/2 - compartmentGap/2, 0, 0]}
                                        width={isDouble ? (doorZoneWidth - compartmentGap)/2 : doorZoneWidth - compartmentGap}
                                        height={height - compartmentGap + totalDoorOverlap}
                                        hexColor={doorHexColor}
                                        imageUrl={doorImageUrl}
                                        handleType={zone.handleType}
                                        isOpen={openCompartments[zone.id]}
                                    />
                                )}
                            </group>
                        );
                    }
                }

                if (zone.content === 'glass_shelf') {
                    const behindDoorGlass = hasDoorInFront || !!zone.doorContent;
                    const glassDepth = behindDoorGlass && doorRecess > 0 ? d - doorRecess : d;
                    const glassZ = behindDoorGlass && doorRecess > 0 ? z - doorRecess / 2 : z;
                    items.push(
                        <mesh key={zone.id} position={[x, y, glassZ]} castShadow receiveShadow>
                            <boxGeometry args={[width, thickness, glassDepth]} />
                            <meshPhysicalMaterial
                                color="#ffffff"
                                transparent
                                opacity={0.3}
                                roughness={0.1}
                                metalness={0.1}
                                transmission={0.9}
                                thickness={0.5}
                            />
                        </mesh>
                    );
                } else {
                    // Pas de décoration posée sur une étagère retirée avec l'outil planches : elle flotterait
                    const cellBottom = y - height / 2;
                    const restsOnRemovedShelf = panelSegments.separatorSegments.some((segment) =>
                        segment.orientation === 'horizontal' &&
                        deletedPanelIds.has(segment.id) &&
                        Math.abs(segment.y + thickness / 2 - cellBottom) < 0.01 &&
                        Math.abs(segment.x - x) < segment.width / 2
                    );
                    if (showDecorations && !restsOnRemovedShelf) {
                        items.push(
                            // Le bas de la case est déjà le dessus de l'étagère (les cases excluent les planches) :
                            // un décalage d'une demi-épaisseur faisait flotter les objets 9,5 mm au-dessus
                            <group key={`${zone.id}-deco`} position={[x, y - height/2, z]}>
                                <ShelfDecoration width={width} height={height} depth={d} seed={zone.id} />
                            </group>
                        );
                    }
                }
            }

            const groupDoor = zone.doorContent || (zone.children && zone.children.length > 0 ? zone.content : null);
            if (zone.children && zone.children.length > 0 && groupDoor && groupDoor.includes('door') && groupDoor !== 'empty') {
                const doorToRender = groupDoor;
                const isDouble = doorToRender === 'door_double';
                const isRight = doorToRender === 'door_right';
                const isPush = doorToRender === 'push_door' || doorToRender === 'push_door_right';
                const isPushRightGroup = doorToRender === 'push_door_right';
                const isMirror = doorToRender === 'mirror_door' || doorToRender === 'mirror_door_right';
                const isMirrorRightGroup = doorToRender === 'mirror_door_right';

                const doorHexColor = zone.zoneColor?.hex || finalDoorColor;
                const doorImageUrl = zone.zoneColor?.imageUrl !== undefined ? zone.zoneColor.imageUrl : finalDoorImageUrl;

                if (isMirror) {
                    items.push(
                        <group key={`${zone.id}-group-door`} {...zoneHandlers(zone.id, true)} position={[x + doorXOffset, y + doorYOffset, d/2 + mountingOffset]}>
                            <AnimatedMirrorDoor
                                side={isMirrorRightGroup ? "right" : "left"}
                                position={[isMirrorRightGroup ? (doorZoneWidth/2 - compartmentGap/2) : (-doorZoneWidth/2 + compartmentGap/2), 0, 0]}
                                width={doorZoneWidth - compartmentGap}
                                height={height - compartmentGap + totalDoorOverlap}
                                handleType={zone.handleType}
                                isOpen={openCompartments[zone.id]}
                            />
                        </group>
                    );
                } else if (isPush) {
                    items.push(
                        <group key={`${zone.id}-group-door`} {...zoneHandlers(zone.id, true)} position={[x + doorXOffset, y + doorYOffset, d/2 + mountingOffset]}>
                            <AnimatedPushDoor
                                side={isPushRightGroup ? "right" : "left"}
                                position={[isPushRightGroup ? (doorZoneWidth/2 - compartmentGap/2) : (-doorZoneWidth/2 + compartmentGap/2), 0, 0]}
                                width={doorZoneWidth - compartmentGap}
                                height={height - compartmentGap + totalDoorOverlap}
                                hexColor={doorHexColor}
                                imageUrl={doorImageUrl}
                                isOpen={openCompartments[zone.id]}
                            />
                        </group>
                    );
                } else {
                    items.push(
                        <group key={`${zone.id}-group-door`} {...zoneHandlers(zone.id, true)} position={[x + doorXOffset, y + doorYOffset, d/2 + mountingOffset]}>
                            {(isDouble || !isRight) && (
                                <AnimatedDoor
                                    side="left"
                                    position={[-doorZoneWidth/2 + compartmentGap/2, 0, 0]}
                                    width={isDouble ? (doorZoneWidth - compartmentGap)/2 : doorZoneWidth - compartmentGap}
                                    height={height - compartmentGap + totalDoorOverlap}
                                    hexColor={doorHexColor}
                                    imageUrl={doorImageUrl}
                                    handleType={zone.handleType}
                                    isOpen={openCompartments[zone.id]}
                                />
                            )}
                            {(isDouble || isRight) && (
                                <AnimatedDoor
                                    side="right"
                                    position={[doorZoneWidth/2 - compartmentGap/2, 0, 0]}
                                    width={isDouble ? (doorZoneWidth - compartmentGap)/2 : doorZoneWidth - compartmentGap}
                                    height={height - compartmentGap + totalDoorOverlap}
                                    hexColor={doorHexColor}
                                    imageUrl={doorImageUrl}
                                    handleType={zone.handleType}
                                    isOpen={openCompartments[zone.id]}
                                />
                            )}
                        </group>
                    );
                }
            }

            if (zone.children && zone.children.length > 0) {
                console.log('🎨 parseZone - zone avec enfants:', zone.id, 'type:', zone.type, 'enfants:', zone.children.length);
                const zoneDoorContent = zone.doorContent || zone.content;
                const zoneHasDoor = hasDoorInFront || !!(zoneDoorContent && typeof zoneDoorContent === 'string' && zoneDoorContent.includes('door'));
                let currentPos = 0;
                zone.children.forEach((child, i) => {
                    let ratio: number;
                    if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
                        ratio = zone.splitRatios[i] / 100;
                    } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
                        ratio = (i === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
                    } else {
                        ratio = 1 / zone.children!.length;
                    }
                    console.log('🎨 parseZone - enfant', i, 'ratio:', ratio);

                    // ANCIEN CODE (bug : ne soustrayait pas l'épaisseur des séparateurs entre
                    // compartiments, contrairement à collectGridCells/collectSeparators plus haut.
                    // Les étagères "coupait" les plaques latérales et arrières
                    //
                    // if (zone.type === 'horizontal') {
                    //     const childHeight = height * ratio;
                    //     const isFirst = i === 0;
                    //     const isLast = i === zone.children!.length - 1;
                    //     const childIsAtTop = isFirst ? isAtTop : false;
                    //     const childIsAtBottom = isLast ? isAtBottom : false;
                    //     parseZone(child, x, (y + height/2) - currentPos - childHeight/2, z, width, childHeight, childIsAtTop, childIsAtBottom, zoneHasDoor, isAtLeft, isAtRight);
                    //     currentPos += childHeight;
                    // } else {
                    //     const childWidth = width * ratio;
                    //     const isFirst = i === 0;
                    //     const isLast = i === zone.children!.length - 1;
                    //     const childIsAtLeft = isFirst ? isAtLeft : false;
                    //     const childIsAtRight = isLast ? isAtRight : false;
                    //     parseZone(child, x - width/2 + currentPos + childWidth/2, y, z, childWidth, height, isAtTop, isAtBottom, zoneHasDoor, childIsAtLeft, childIsAtRight);
                    //     currentPos += childWidth;
                    // }
                    const numSeparators = zone.children!.length - 1;

                    if (zone.type === 'horizontal') {
                        const availableHeight = height - numSeparators * thickness;
                        const childHeight = availableHeight * ratio;
                        const isFirst = i === 0;
                        const isLast = i === zone.children!.length - 1;
                        const childIsAtTop = isFirst ? isAtTop : false;
                        const childIsAtBottom = isLast ? isAtBottom : false;
                        parseZone(child, x, (y + height/2) - currentPos - childHeight/2, z, width, childHeight, childIsAtTop, childIsAtBottom, zoneHasDoor, isAtLeft, isAtRight);
                        currentPos += childHeight;
                        if (i < zone.children!.length - 1) currentPos += thickness;
                    } else {
                        const availableWidth = width - numSeparators * thickness;
                        const childWidth = availableWidth * ratio;
                        const isFirst = i === 0;
                        const isLast = i === zone.children!.length - 1;
                        const childIsAtLeft = isFirst ? isAtLeft : false;
                        const childIsAtRight = isLast ? isAtRight : false;
                        parseZone(child, x - width/2 + currentPos + childWidth/2, y, z, childWidth, height, isAtTop, isAtBottom, zoneHasDoor, childIsAtLeft, childIsAtRight);
                        currentPos += childWidth;
                        if (i < zone.children!.length - 1) currentPos += thickness;
                    }
                });
            }
        };

        parseZone(rootZone, 0, sideHeight/2 + yOffset, 0, w - (thickness * 2), sideHeight - (thickness * 2));
        return items;
    }, [
        panelSegments, deletedPanelIds,
        rootZone, w, sideHeight, yOffset, thickness, compartmentGap, mountingOffset, doorOverlap, doorRecess, d,
        finalStructureColor, finalShelfColor, finalDrawerColor, finalDoorColor, finalBackColor, finalBaseColor,
        finalStructureImageUrl, finalShelfImageUrl, finalDrawerImageUrl, finalDoorImageUrl, finalBackImageUrl, finalBaseImageUrl,
        separatorColor, separatorImageUrl,
        openCompartments, showDecorations, hideDrawers, zoneHandlers,
        selectedPanelIds, onSelectPanel
    ]);


    const handlePanelSelect = useCallback((panelId: string | null) => {
        if (panelId && onSelectZone) {
            onSelectZone(null);
        }
        onSelectPanel?.(panelId);
    }, [onSelectPanel, onSelectZone]);

    // Les panneaux ne réagissent au pointeur que pendant l'outil « retirer des planches ». Le reste du temps,
    // un clic sur un panneau (côté, dessus, cloison...) tombe sur le compartiment qu'il borde : avant, il
    // était avalé par le panneau, qui effaçait en plus la sélection.
    const panelToolActive = !!onSelectPanel;
    const backPanelHandlers = panelToolActive
        ? {
            onPointerOver: (e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
            },
            onPointerOut: () => {
                document.body.style.cursor = 'default';
            },
            onClick: (e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                if (!isRealClick(e)) return;
                handlePanelSelect(selectedPanelIds.has('panel-back') ? null : 'panel-back');
            },
        }
        : {};

    // Porte globale (ancien format) : un clic ouvre ou ferme les portes et sélectionne le meuble entier
    const rootDoorHandlers = {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
        },
        onPointerOut: () => {
            document.body.style.cursor = 'default';
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            if (!isRealClick(e)) return;
            onToggleDoors?.();
            onSelectZone?.(selectedZoneIds.includes('root') ? null : 'root');
        },
    };

    return (
        <group>
            {panelSegments.leftSegments.map((segment) => (
                !deletedPanelIds.has(segment.id) && (
                    <StructuralPanel
                        key={`visual-${segment.id}`}
                        position={[segment.x, segment.y, 0]}
                        size={[segment.width, segment.height, d]}
                        hexColor={finalStructureColor}
                        imageUrl={finalStructureImageUrl}
                        castShadow={false}
                    />
                )
            ))}
            {panelToolActive && panelSegments.leftSegments.map((segment) => (
                <PanelSegmentHitbox
                    key={segment.id}
                    panelId={segment.id}
                    position={[segment.x, segment.y, 0]}
                    size={[segment.width, segment.height, d]}
                    isSelected={selectedPanelIds.has(segment.id)}
                    onSelect={handlePanelSelect}
                    isDeleted={deletedPanelIds.has(segment.id)}
                />
            ))}

            {panelSegments.rightSegments.map((segment) => (
                !deletedPanelIds.has(segment.id) && (
                    <StructuralPanel
                        key={`visual-${segment.id}`}
                        position={[segment.x, segment.y, 0]}
                        size={[segment.width, segment.height, d]}
                        hexColor={finalStructureColor}
                        imageUrl={finalStructureImageUrl}
                        castShadow={false}
                    />
                )
            ))}
            {panelToolActive && panelSegments.rightSegments.map((segment) => (
                <PanelSegmentHitbox
                    key={segment.id}
                    panelId={segment.id}
                    position={[segment.x, segment.y, 0]}
                    size={[segment.width, segment.height, d]}
                    isSelected={selectedPanelIds.has(segment.id)}
                    onSelect={handlePanelSelect}
                    isDeleted={deletedPanelIds.has(segment.id)}
                />
            ))}

            {panelSegments.topSegments.map((segment) => (
                !deletedPanelIds.has(segment.id) && (
                    <StructuralPanel
                        key={`visual-${segment.id}`}
                        position={[segment.x, segment.y, 0]}
                        size={[segment.width, segment.height, d]}
                        hexColor={finalStructureColor}
                        imageUrl={finalStructureImageUrl}
                    />
                )
            ))}
            {panelToolActive && panelSegments.topSegments.map((segment) => (
                <PanelSegmentHitbox
                    key={segment.id}
                    panelId={segment.id}
                    position={[segment.x, segment.y, 0]}
                    size={[segment.width, segment.height, d]}
                    isSelected={selectedPanelIds.has(segment.id)}
                    onSelect={handlePanelSelect}
                    isDeleted={deletedPanelIds.has(segment.id)}
                />
            ))}

            {showDecorations && h <= 1.5 && (
                <group position={[0, h, 0]}>
                    {w > 0.6 && (
                        <Lamp position={[w/2 - 0.2, 0, 0]} />
                    )}
                    {w > 0.8 && (
                        <Plant position={[-w/2 + 0.25, 0, 0.05]} seed="top-plant" scale={1.1} />
                    )}
                    {w > 1.2 && (
                        <Books position={[0, 0, -0.05]} count={Math.min(6, Math.floor(w * 3))} seed="top-books" />
                    )}
                    {w > 1.6 && (
                        <Vase position={[w/2 - 0.5, 0, -0.1]} color="#C4B5A3" scale={0.9} seed="top-vase" />
                    )}
                </group>
            )}

            {panelSegments.bottomSegments.map((segment) => {
                const isDeleted = deletedPanelIds.has(segment.id);
                console.log('🟢 BOTTOM RENDER:', segment.id, 'isDeleted:', isDeleted, 'deletedPanelIds:', Array.from(deletedPanelIds));
                return !isDeleted && (
                    <StructuralPanel
                        key={`visual-${segment.id}`}
                        position={[segment.x, segment.y, 0]}
                        size={[segment.width, segment.height, d]}
                        hexColor={finalStructureColor}
                        imageUrl={finalStructureImageUrl}
                    />
                );
            })}
            {panelToolActive && panelSegments.bottomSegments.map((segment) => (
                <PanelSegmentHitbox
                    key={segment.id}
                    panelId={segment.id}
                    position={[segment.x, segment.y, 0]}
                    size={[segment.width, segment.height, d]}
                    isSelected={selectedPanelIds.has(segment.id)}
                    onSelect={handlePanelSelect}
                    isDeleted={deletedPanelIds.has(segment.id)}
                />
            ))}

            {/* ANCIEN CODE (bug : profondeur = profondeur TOTALE du meuble (d), le séparateur
                va donc jusqu'au même plan que la face extérieure du panneau de fond, au lieu de
                s'arrêter devant lui -> sa couleur "sort" à l'arrière du meuble ; vu sous certains
                angles ça peut aussi sembler chevaucher les côtés) :

            {panelSegments.separatorSegments.map((segment) => {
                const sepDepth = segment.behindDoor && doorRecess > 0 ? d - doorRecess : d;
                const sepZ = segment.behindDoor && doorRecess > 0 ? -doorRecess / 2 : 0;
                return !deletedPanelIds.has(segment.id) && (
                    <StructuralPanel
                        key={`visual-${segment.id}`}
                        position={[segment.x, segment.y, sepZ]}
                        size={[segment.width, segment.height, sepDepth]}
                        hexColor={segment.orientation === 'vertical' ? separatorColor : finalShelfColor}
                        imageUrl={segment.orientation === 'vertical' ? separatorImageUrl : finalShelfImageUrl}
                    />
                );
            })}
            {panelToolActive && panelSegments.separatorSegments.map((segment) => {
                const sepHitDepth = segment.behindDoor && doorRecess > 0 ? d - doorRecess : d;
                const sepHitZ = segment.behindDoor && doorRecess > 0 ? -doorRecess / 2 : 0;
                return <PanelSegmentHitbox
                    key={segment.id}
                    panelId={segment.id}
                    position={[segment.x, segment.y, sepHitZ]}
                    size={[segment.width, segment.height, sepHitDepth]}
                    isSelected={selectedPanelIds.has(segment.id)}
                    onSelect={handlePanelSelect}
                    isDeleted={deletedPanelIds.has(segment.id)}
                />;
            })}
            */}
            
            {panelSegments.separatorSegments.map((segment) => {
                const sepBaseDepth = segment.behindDoor && doorRecess > 0 ? d - doorRecess : d;
                const sepBaseZ = segment.behindDoor && doorRecess > 0 ? -doorRecess / 2 : 0;
                const sepDepth = sepBaseDepth - backPanelThickness;
                const sepZ = sepBaseZ + backPanelThickness / 2;
                return !deletedPanelIds.has(segment.id) && (
                    <StructuralPanel
                        key={`visual-${segment.id}`}
                        position={[segment.x, segment.y, sepZ]}
                        size={[segment.width, segment.height, sepDepth]}
                        hexColor={segment.orientation === 'vertical' ? separatorColor : finalShelfColor}
                        imageUrl={segment.orientation === 'vertical' ? separatorImageUrl : finalShelfImageUrl}
                    />
                );
            })}
            {panelSegments.separatorSegments.map((segment) => {
                const sepHitBaseDepth = segment.behindDoor && doorRecess > 0 ? d - doorRecess : d;
                const sepHitBaseZ = segment.behindDoor && doorRecess > 0 ? -doorRecess / 2 : 0;
                const sepHitDepth = sepHitBaseDepth - backPanelThickness;
                const sepHitZ = sepHitBaseZ + backPanelThickness / 2;
                return <PanelSegmentHitbox
                    key={segment.id}
                    panelId={segment.id}
                    position={[segment.x, segment.y, sepHitZ]}
                    size={[segment.width, segment.height, sepHitDepth]}
                    isSelected={selectedPanelIds.has(segment.id)}
                    onSelect={handlePanelSelect}
                    isDeleted={deletedPanelIds.has(segment.id)}
                />;
            })}

            {/* Bandes de fond dédiées, une par étagère/cloison : le fond est découpé en une
                pièce par compartiment (pour pouvoir le retirer compartiment par compartiment),
                ce qui laisse un vide exactement là où passe chaque étagère/cloison — aucune
                pièce de fond ne "possède" cet espace-là. On pose ici une pièce de fond à part
                entière sur cette même étroite bande, avec le même ID que le séparateur : si on
                retire l'étagère/cloison via l'outil, cette bande de fond disparaît avec elle
                (et inversement elle n'existe que tant que l'étagère/cloison existe).
                Comme les backSegments normaux, on étend cette bande de +thickness quand elle
                touche un bord du meuble — sinon elle s'arrête à la largeur/hauteur intérieure
                du séparateur et laisse un vide juste derrière la bande de remplissage du
                côté/dessus/dessous à cet endroit précis. */}
            {panelSegments.separatorSegments.map((segment) => {
                if (deletedPanelIds.has(segment.id)) return null;
                let fillX = segment.x;
                let fillY = segment.y;
                let fillWidth = segment.width;
                let fillHeight = segment.height;
                if (segment.orientation === 'horizontal') {
                    const touchesLeft = (segment.x - segment.width / 2) <= (-w / 2 + thickness + 0.01);
                    const touchesRight = (segment.x + segment.width / 2) >= (w / 2 - thickness - 0.01);
                    if (touchesLeft) { fillWidth += thickness; fillX -= thickness / 2; }
                    if (touchesRight) { fillWidth += thickness; fillX += thickness / 2; }
                } else {
                    const furnitureBottomInner = yOffset + thickness;
                    const furnitureTopInner = yOffset + sideHeight - thickness;
                    const touchesBottom = (segment.y - segment.height / 2) <= (furnitureBottomInner + 0.01);
                    const touchesTop = (segment.y + segment.height / 2) >= (furnitureTopInner - 0.01);
                    if (touchesBottom) { fillHeight += thickness; fillY -= thickness / 2; }
                    if (touchesTop) { fillHeight += thickness; fillY += thickness / 2; }
                }
                return (
                    <StructuralPanel
                        key={`back-fill-${segment.id}`}
                        position={[fillX, fillY, -d/2 + 0.002]}
                        size={[fillWidth, fillHeight, 0.004]}
                        hexColor={finalBackColor}
                        imageUrl={finalBackImageUrl}
                        castShadow={false}
                    />
                );
            })}

            {/* Même principe que la bande de fond ci-dessus, mais pour les côtés gauche/droite :
                eux aussi sont découpés par rangée (pour les retirer un par un), donc ils
                laissent un vide à l'endroit où une étagère touche le bord du meuble. Seules les
                étagères (horizontales) peuvent toucher un bord gauche/droit — une cloison
                (verticale) est toujours entre deux colonnes, jamais sur le bord. */}
            {panelSegments.separatorSegments.map((segment) => {
                if (segment.orientation !== 'horizontal' || deletedPanelIds.has(segment.id)) {
                    return null;
                }
                const touchesLeft = (segment.x - segment.width / 2) <= (-w / 2 + thickness + 0.01);
                const touchesRight = (segment.x + segment.width / 2) >= (w / 2 - thickness - 0.01);
                return (
                    <React.Fragment key={`side-fill-${segment.id}`}>
                        {touchesLeft && (
                            <StructuralPanel
                                position={[-w / 2 + thickness / 2, segment.y, 0]}
                                size={[thickness, segment.height, d]}
                                hexColor={finalStructureColor}
                                imageUrl={finalStructureImageUrl}
                                castShadow={false}
                            />
                        )}
                        {touchesRight && (
                            <StructuralPanel
                                position={[w / 2 - thickness / 2, segment.y, 0]}
                                size={[thickness, segment.height, d]}
                                hexColor={finalStructureColor}
                                imageUrl={finalStructureImageUrl}
                                castShadow={false}
                            />
                        )}
                    </React.Fragment>
                );
            })}

            {elements}

            <ZoneHighlights
                rootZone={rootZone}
                layout={layout}
                selectedZoneIds={selectedZoneIds}
                // L'outil « retirer des planches » travaille sur les panneaux : pas de survol de zone
                hoveredZoneId={onSelectPanel ? null : hoveredZoneId}
                selectionTint={selectionTint}
            />
            {hoveredZoneId && rootZone && !onSelectPanel && (
                <ZoneHoverTag
                    rootZone={rootZone}
                    zoneId={hoveredZoneId}
                    layout={layout}
                    widthMm={width}
                    heightMm={height}
                    clickToOpen={!onSelectZone}
                />
            )}
            {dividerEvents && rootZone && !onSelectPanel && (
                <DividerHandles
                    rootZone={rootZone}
                    layout={layout}
                    widthMm={width}
                    heightMm={height}
                    doorsOpen={!!doorsOpen}
                    selectedZoneIds={selectedZoneIds}
                    onPreview={dividerEvents.onPreview}
                    onCommit={dividerEvents.onCommit}
                />
            )}

            {rootZone && doorType !== 'none' && !hasZoneSpecificDoors && (
                <group position={[0, sideHeight/2 + yOffset, d/2]} {...rootDoorHandlers}>
                    {(doorType === 'double' || (doorType === 'single' && doorSide === 'left')) && (
                        <AnimatedDoor
                            side="left"
                            position={[-w/2, 0, 0]}
                            width={doorType === 'double' ? w/2 : w}
                            height={sideHeight}
                            hexColor={finalDoorColor}
                            imageUrl={finalDoorImageUrl}
                            isOpen={doorsOpen}
                        />
                    )}
                    {(doorType === 'double' || (doorType === 'single' && doorSide === 'right')) && (
                        <AnimatedDoor
                            side="right"
                            position={[w/2, 0, 0]}
                            width={doorType === 'double' ? w/2 : w}
                            height={sideHeight}
                            hexColor={finalDoorColor}
                            imageUrl={finalDoorImageUrl}
                            isOpen={doorsOpen}
                        />
                    )}
                </group>
            )}

            {doorType !== 'none' && !hasZoneSpecificDoors && (
                <mesh
                    position={[0, sideHeight/2 + yOffset, d/2 + 0.01]}
                    visible={false}
                    {...rootDoorHandlers}
                >
                    <boxGeometry args={[w, sideHeight, 0.02]} />
                </mesh>
            )}

            {hasSocle && (
                <>
                    {socle === 'metal' ? (
                        <group position={[0, 0, 0]}>
                            <mesh position={[-w/2 + 0.05, 0.05, -d/2 + 0.05]} castShadow>
                                <boxGeometry args={[0.03, 0.1, 0.03]} />
                                <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
                            </mesh>
                            <mesh position={[w/2 - 0.05, 0.05, -d/2 + 0.05]} castShadow>
                                <boxGeometry args={[0.03, 0.1, 0.03]} />
                                <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
                            </mesh>
                            <mesh position={[-w/2 + 0.05, 0.05, d/2 - 0.05]} castShadow>
                                <boxGeometry args={[0.03, 0.1, 0.03]} />
                                <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
                            </mesh>
                            <mesh position={[w/2 - 0.05, 0.05, d/2 - 0.05]} castShadow>
                                <boxGeometry args={[0.03, 0.1, 0.03]} />
                                <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
                            </mesh>
                        </group>
                    ) : (
                        <group>
                            {panelSegments.bottomSegments.map((segment, index) => {
                                if (deletedPanelIds.has(segment.id)) return null;

                                const isFirst = index === 0;
                                const isLast = index === panelSegments.bottomSegments.length - 1;
                                const separatorGap = thickness;

                                let socleX = segment.x;
                                let socleWidth = segment.width;

                                if (!isLast) {
                                    socleWidth += separatorGap / 2;
                                    socleX += separatorGap / 4;
                                }
                                if (!isFirst) {
                                    socleWidth += separatorGap / 2;
                                    socleX -= separatorGap / 4;
                                }

                                return (
                                    <mesh
                                        key={`socle-${segment.id}`}
                                        position={[socleX, 0.05, 0]}
                                        castShadow
                                        receiveShadow
                                    >
                                        <boxGeometry args={[socleWidth, 0.1, d - 0.02]} />
                                        <TexturedMaterial hexColor={finalBaseColor} imageUrl={finalBaseImageUrl} />
                                    </mesh>
                                );
                            })}
                        </group>
                    )}
                </>
            )}

            {openSpaceInfo.length === 0 ? (
                <>
                    {panelSegments.backSegments.map((segment) => (
                        !deletedPanelIds.has(segment.id) && (
                            <StructuralPanel
                                key={`visual-${segment.id}`}
                                position={[segment.x, segment.y, -d/2 + 0.002]}
                                size={[segment.width, segment.height, 0.004]}
                                hexColor={finalBackColor}
                                imageUrl={finalBackImageUrl}
                                castShadow={false}
                            />
                        )
                    ))}
                    {panelToolActive && panelSegments.backSegments.map((segment) => (
                        <PanelSegmentHitbox
                            key={segment.id}
                            panelId={segment.id}
                            position={[segment.x, segment.y, -d/2 + 0.002]}
                            size={[segment.width, segment.height, 0.004]}
                            isSelected={selectedPanelIds.has(segment.id)}
                            onSelect={handlePanelSelect}
                            isDeleted={deletedPanelIds.has(segment.id)}
                        />
                    ))}
                </>
            ) : (
                <group {...backPanelHandlers}>
                    <BackPanelWithOpenings
                        totalWidth={w - 0.01}
                        totalHeight={sideHeight - 0.01}
                        yOffset={sideHeight/2 + yOffset}
                        zOffset={-d/2 + 0.002}
                        openSpaces={openSpaceInfo}
                        hexColor={finalBackColor}
                        imageUrl={finalBackImageUrl}
                    />
                    {selectedPanelIds.has('panel-back') && (
                        <mesh position={[0, sideHeight/2 + yOffset, -d/2 + 0.003]}>
                            <boxGeometry args={[w - 0.005, sideHeight - 0.005, 0.006]} />
                            <meshBasicMaterial color="#3B3E58" wireframe transparent opacity={0.5} toneMapped={false} />
                        </mesh>
                    )}
                </group>
            )}
        </group>
    );
}


// Le rappel des gestes n'est montré qu'une fois par visite : pas à chaque retour du plan 2D
let navigationHintSeen = false;

// Rappel des gestes, affiché au début puis masqué dès la première interaction
function NavigationHint() {
    const touch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

    return (
        <div
            role="note"
            className="pointer-events-none absolute bottom-14 left-3 z-10 max-w-[calc(100%-1.5rem)] rounded-sm bg-am-navy/80 px-3 py-1.5 text-[11px] leading-snug text-white lg:bottom-16 lg:left-4 lg:max-w-[calc(100%-14rem)]"
        >
            {touch
                ? 'Glisser : tourner · Pincer : zoomer · Double-tap : ouvrir / fermer'
                : 'Glisser : tourner · Molette : zoomer · Clic droit : déplacer · Double-clic : ouvrir / fermer'}
        </div>
    );
}

const ThreeCanvas = forwardRef<ThreeCanvasHandle, ThreeViewerProps>((props, ref) => {
    const { onSelectZone, rootZone, selectedZoneIds, width, height, depth, hasSocle, onResizeDivider } = props;
    const captureRef = useRef<(() => string | null) | null>(null);

    // Glissement d'une cloison ou d'une étagère : la scène suit en direct, la configuration n'est modifiée
    // qu'au relâchement (une seule étape dans l'historique, au lieu d'une par mouvement de souris)
    const [dividerPreview, setDividerPreview] = useState<DividerChange | null>(null);
    const displayedRootZone = useMemo(
        () => (dividerPreview && rootZone ? applySplitRatios(rootZone, dividerPreview.zoneId, dividerPreview.ratios) : rootZone),
        [rootZone, dividerPreview]
    );
    const dividerEvents = useMemo<DividerEvents | undefined>(
        () =>
            onResizeDivider
                ? {
                    onPreview: setDividerPreview,
                    onCommit: ({ zoneId, ratios }) => {
                        onResizeDivider(zoneId, ratios);
                        setDividerPreview(null);
                    },
                }
                : undefined,
        [onResizeDivider]
    );
    const cameraApi = useRef<CameraApi | null>(null);
    const [hintVisible, setHintVisible] = useState(!navigationHintSeen);

    useImperativeHandle(ref, () => ({
        captureScreenshot: () => {
            if (captureRef.current) {
                return captureRef.current();
            }
            return null;
        }
    }), []);

    useEffect(() => {
        const timer = setTimeout(() => setHintVisible(false), 9000);
        return () => {
            clearTimeout(timer);
            navigationHintSeen = true;
        };
    }, []);

    const handleCapture = (fn: () => string | null) => {
        captureRef.current = fn;
    };

    // Ce que la caméra doit cadrer : le meuble entier, ou les zones sélectionnées
    const layout = useMemo(() => getFurnitureLayout(width, height, depth, hasSocle), [width, height, depth, hasSocle]);
    const furnitureBox = useMemo(() => getFurnitureBox(layout), [layout]);
    const selectionBox = useMemo(() => {
        if (!rootZone || !selectedZoneIds?.length) return null;
        return unionBoxes(selectedZoneIds.map((id) => getZoneBox(rootZone, id, layout)).filter((box): box is Box => !!box));
    }, [rootZone, selectedZoneIds, layout]);
    const sizeKey = `${layout.width.toFixed(3)}|${(layout.sideHeight + layout.yOffset).toFixed(3)}|${layout.depth.toFixed(3)}`;

    return (
        <div
            style={{ width: '100%', height: '100%', background: 'var(--am-paper)', position: 'relative' }}
            onPointerDownCapture={() => {
                navigationHintSeen = true;
                setHintVisible(false);
            }}
        >
            <Canvas
                shadows
                dpr={[1, 2]}
                camera={{ position: [4, 2.5, 5], fov: 35, near: 0.05 }}
                onPointerMissed={() => onSelectZone?.(null)}
                onCreated={({ gl }) => {
                    gl.setClearColor('#FAFAF9');
                    gl.toneMapping = THREE.ACESFilmicToneMapping;
                    gl.toneMappingExposure = 1.1;
                }}
                gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
            >
                <OrbitControls
                    makeDefault
                    enableDamping
                    dampingFactor={0.1}
                    // La molette zoome vers le curseur : on peut viser un petit compartiment
                    zoomToCursor
                    minDistance={0.6}
                    maxDistance={14}
                    maxPolarAngle={Math.PI / 2 - 0.05}
                />
                <CameraRig furnitureBox={furnitureBox} selectionBox={selectionBox} sizeKey={sizeKey} apiRef={cameraApi} />
                <ambientLight intensity={0.4} />
                <hemisphereLight intensity={0.5} groundColor="#ffffff" color="#ffffff" />
                <pointLight position={[10, 10, 10]} intensity={1.0} />
                <directionalLight
                    position={[-5, 8, 5]}
                    intensity={1.0}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                    shadow-camera-left={-10}
                    shadow-camera-right={10}
                    shadow-camera-top={10}
                    shadow-camera-bottom={-10}
                    shadow-bias={-0.0001}
                />

                <Suspense fallback={null}>
                    <Room />
                    <Furniture
                        {...props}
                        rootZone={displayedRootZone}
                        imageUrl={props.imageUrl}
                        dividerEvents={dividerEvents}
                    />
                    <HumanSilhouette />
                    <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={15} blur={2.5} far={1.5} />
                    <Environment preset="city" background={false} />
                </Suspense>
            </Canvas>
            <CameraToolbar apiRef={cameraApi} hasSelection={!!selectionBox} />
            {hintVisible && <NavigationHint />}
        </div>
    );
});

ThreeCanvas.displayName = 'ThreeCanvas';

export default ThreeCanvas;

