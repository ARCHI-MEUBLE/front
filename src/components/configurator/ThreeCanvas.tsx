import React, { Suspense, useMemo, useRef, useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
// On retire useFrame de l'import react-three/fiber
import { Canvas, useThree, RootState } from '@react-three/fiber';
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

export type { ThreeCanvasHandle };

// --- Hooks Utilitaires ---

// On supprime useAnimationFrame car il causait des erreurs de contexte R3F
// Les composants utilisent maintenant requestAnimationFrame directement dans useEffect

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
    onSelectZone?: (id: string | null) => void;
    selectedPanelIds?: Set<string>;
    onSelectPanel?: (panelId: string | null) => void;
    deletedPanelIds?: Set<string>;
    isBuffet?: boolean;
    doorsOpen?: boolean;
    showDecorations?: boolean;
    onToggleDoors?: () => void;
    componentColors?: ComponentColors;
    doorType?: 'none' | 'single' | 'double';
    doorSide?: 'left' | 'right';
    useMultiColor?: boolean;
    mountingStyle?: 'applique' | 'encastre';
    onCaptureReady?: (captureFunction: () => string | null) => void;
}



function Furniture({
                       width, height, depth, color, imageUrl, hasSocle, socle, rootZone, isBuffet,
                       doorsOpen, showDecorations, onToggleDoors, componentColors,
                       doorType = 'none',
                       doorSide = 'left',
                       useMultiColor = false,
                       mountingStyle = 'applique',
                       selectedZoneIds = [],
                       onSelectZone,
                       selectedPanelIds = new Set(),
                       onSelectPanel,
                       deletedPanelIds = new Set()
                   }: ThreeViewerProps) {
    const [openCompartments, setOpenCompartments] = useState<Record<string, boolean>>({});

    // Synchronisation avec l'état global doorsOpen
    useEffect(() => {
        if (rootZone) {
            const newOpenStates: Record<string, boolean> = {};
            const applyOpenState = (zone: Zone) => {
                if (zone.type === 'leaf' && (zone.content === 'drawer' || zone.content === 'push_drawer' || zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double' || zone.content === 'push_door' || zone.content === 'push_door_right' || zone.content === 'mirror_door' || zone.content === 'mirror_door_right')) {
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
    const { w, h, d, sideHeight, yOffset, thickness, compartmentGap, mountingOffset, doorOverlap, doorRecess } = useMemo(() => {
        const w = (width || 1500) / 1000;
        const h = (height || 730) / 1000;
        const d = (depth || 500) / 1000;
        const thickness = 0.019;
        const sideHeight = hasSocle ? h - 0.1 : h;
        const yOffset = hasSocle ? 0.1 : 0;
        const compartmentGap = mountingStyle === 'encastre' ? 0.006 : 0.003;
        // En encastré, reculer les portes de 22mm pour que leur face avant soit derrière la face avant des montants
        // Cela évite le z-fighting entre les bords des portes et les montants structurels
        const mountingOffset = mountingStyle === 'encastre' ? -0.022 : 0;
        // En appliqué, les portes débordent pour recouvrir le cadre (dessus/dessous)
        const doorOverlap = mountingStyle === 'encastre' ? 0 : thickness;
        // Pas de retrait des étagères (crée des trous visibles avec le caisson)
        const doorRecess = 0;
        return { w, h, d, sideHeight, yOffset, thickness, compartmentGap, mountingOffset, doorOverlap, doorRecess };
    }, [width, height, depth, hasSocle, mountingStyle]);

    // Couleur par défaut
    const DEFAULT_COLOR = '#D8C7A1';

    // Couleur de base (structure) - utilisée comme fallback pour tout
    const baseStructureColor = color || DEFAULT_COLOR;
    const baseStructureImageUrl = imageUrl || null;

    // Calcul des couleurs finales - simplifié et robuste
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

    // Check if any zone has a zone-specific door
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

    // Collecter les informations sur les espaces ouverts pour le rendu du fond
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

                    if (zone.type === 'horizontal') {
                        const childHeight = height * ratio;
                        collectOpenSpaces(child, x, (y + height/2) - currentPos - childHeight/2, width, childHeight);
                        currentPos += childHeight;
                    } else {
                        const childWidth = width * ratio;
                        collectOpenSpaces(child, x - width/2 + currentPos + childWidth/2, y, childWidth, height);
                        currentPos += childWidth;
                    }
                });
            }
        };

        collectOpenSpaces(rootZone, 0, sideHeight/2 + yOffset, w - (thickness * 2), sideHeight - (thickness * 2));
        return openSpaces;
    }, [rootZone, w, sideHeight, yOffset, thickness]);

    // Calculer les segments de panneaux basés sur la structure des zones
    // Cela permet de sélectionner des portions de panneaux correspondant aux zones
    interface PanelSegment {
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }

    // Interface pour les segments du panneau arrière (2D grid)
    interface BackPanelSegment extends PanelSegment {
        colIndex: number;
        rowIndex: number;
    }

    // Interface pour les séparateurs
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
            // Si pas de zones, un seul segment par panneau
            topSegments.push({ id: 'panel-top-0', x: 0, y: h - thickness/2, width: w, height: thickness });
            bottomSegments.push({ id: 'panel-bottom-0', x: 0, y: yOffset + thickness/2, width: w, height: thickness });
            leftSegments.push({ id: 'panel-left-0', x: -w/2 + thickness/2, y: sideHeight/2 + yOffset, width: thickness, height: sideHeight });
            rightSegments.push({ id: 'panel-right-0', x: w/2 - thickness/2, y: sideHeight/2 + yOffset, width: thickness, height: sideHeight });
            backSegments.push({ id: 'panel-back-0-0', x: 0, y: sideHeight/2 + yOffset, width: w - 0.01, height: sideHeight - 0.01, colIndex: 0, rowIndex: 0 });
            return { topSegments, bottomSegments, leftSegments, rightSegments, backSegments, separatorSegments };
        }

        // Fonction pour collecter toutes les cellules (grille 2D) récursivement
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
                // Soustraire l'espace occupé par les séparateurs
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
                // Soustraire l'espace occupé par les séparateurs
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

        // Collecter les séparateurs récursivement
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

            // Si pas d'enfants, retourner vide
            if (!zone.children || zone.children.length === 0) {
                return separators;
            }

            // Si un seul enfant, pas de séparateurs à ce niveau mais on doit quand même
            // récurser dans l'enfant pour collecter ses séparateurs internes
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
                // Soustraire l'espace occupé par les séparateurs
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

                    // Ajouter séparateur vertical après chaque colonne sauf la dernière
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

                    // Récursion dans l'enfant
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
                // Soustraire l'espace occupé par les séparateurs
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

                    // Ajouter séparateur horizontal après chaque rangée sauf la dernière
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

                    // Récursion dans l'enfant
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

        // Collecter toutes les cellules de la grille
        const allCells = collectGridCells(
            rootZone,
            0,
            sideHeight / 2 + yOffset,
            innerWidth,
            innerHeight
        );

        // Collecter tous les séparateurs
        const allSeparators = collectSeparators(
            rootZone,
            0,
            sideHeight / 2 + yOffset,
            innerWidth,
            innerHeight
        );

        // Définir les limites ABSOLUES de l'intérieur du meuble (basées sur la structure, pas les cellules)
        // Ces valeurs correspondent aux bords internes des panneaux haut/bas
        const furnitureBottomInner = yOffset + thickness;  // Haut du panneau du bas
        const furnitureTopInner = yOffset + sideHeight - thickness;  // Bas du panneau du haut

        // Créer les segments du panneau arrière basés sur les cellules
        // Calculer les limites min/max réelles des cellules (pour référence)
        const minCellY = Math.min(...allCells.map(c => c.y - c.height / 2));
        const maxCellY = Math.max(...allCells.map(c => c.y + c.height / 2));
        const minCellX = Math.min(...allCells.map(c => c.x - c.width / 2));
        const maxCellX = Math.max(...allCells.map(c => c.x + c.width / 2));

        allCells.forEach((cell, i) => {
            let segX = cell.x;
            let segY = cell.y;
            let segWidth = cell.width;
            let segHeight = cell.height;

            // Utiliser les limites réelles des cellules pour déterminer les bords
            const cellBottom = cell.y - cell.height / 2;
            const cellTop = cell.y + cell.height / 2;
            const cellLeft = cell.x - cell.width / 2;
            const cellRight = cell.x + cell.width / 2;

            // Vérifier si la cellule est aux bords par rapport aux autres cellules
            const isLeftmost = cellLeft <= minCellX + 0.01;
            const isRightmost = cellRight >= maxCellX - 0.01;
            const isTopmost = cellTop >= maxCellY - 0.01;
            const isBottommost = cellBottom <= minCellY + 0.01;

            // Vérifier AUSSI contre les limites absolues du meuble (pour les colonnes internes)
            // Utiliser une tolérance plus grande (0.05) pour capturer les cellules proches du bord
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
            // Étendre vers le haut si cellule au sommet
            if (isTopmost || touchesFurnitureTop) {
                segHeight += thickness;
                segY += thickness / 2;
            }
            // Étendre vers le bas si cellule au fond du meuble - étendre jusqu'au socle
            if (isBottommost || touchesFurnitureBottom) {
                // Calculer l'extension exacte nécessaire pour atteindre le haut du socle (yOffset)
                const gapToBottom = cellBottom - yOffset;
                const extensionBottom = Math.max(thickness, gapToBottom + 0.001);
                segHeight += extensionBottom;
                segY -= extensionBottom / 2;
            }

            const colIndex = cell.colPath.length > 0 ? cell.colPath[0] : 0;
            const rowIndex = cell.rowPath.length > 0 ? cell.rowPath[0] : 0;

            // Utiliser le chemin complet pour un ID unique et stable
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

        // DEBUG: Log pour comparer avec PanelPlanCanvas
        console.log('ThreeCanvas - Back panel IDs:', allCells.map((cell) => {
            const pathId = `c${cell.colPath.join('_')}-r${cell.rowPath.join('_')}`;
            return `panel-back-${pathId}`;
        }));

        // Pour le panneau du haut - segmenter selon les colonnes de premier niveau
        // IMPORTANT: Ne considérer que les cellules qui touchent le bord SUPÉRIEUR
        // Tolérance augmentée à 0.05 (5cm) pour gérer les cas où splitRatios ne somment pas à 100%
        const maxY = Math.max(...allCells.map(c => c.y + c.height / 2));
        const topTouchingCells = allCells.filter(cell =>
            cell.y + cell.height / 2 >= maxY - 0.05
        );

        // Identifier les colonnes uniques parmi les cellules touchant le haut
        const uniqueTopColumns = new Map<number, GridCell[]>();
        topTouchingCells.forEach(cell => {
            const key = Math.round(cell.x * 1000);
            if (!uniqueTopColumns.has(key)) {
                uniqueTopColumns.set(key, []);
            }
            uniqueTopColumns.get(key)!.push(cell);
        });

        // Créer un segment de panneau haut pour chaque colonne
        const sortedTopColumns = Array.from(uniqueTopColumns.entries())
            .sort(([keyA], [keyB]) => keyA - keyB);

        if (sortedTopColumns.length > 1) {
            sortedTopColumns.forEach(([, cells], index) => {
                // Prendre la première cellule de cette colonne pour obtenir la position
                const cell = cells[0];
                const isLeftmost = index === 0;
                const isRightmost = index === sortedTopColumns.length - 1;

                let segX = cell.x;
                let segWidth = cell.width;

                // Étendre aux bords pour les colonnes extrêmes
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
            // Pas de colonnes multiples, un seul segment
            topSegments.push({
                id: 'panel-top-0',
                x: 0,
                y: h - thickness / 2,
                width: w,
                height: thickness
            });
        }

        // Pour le panneau du bas - segmenter selon les colonnes qui touchent le BAS
        // IMPORTANT: Ne considérer que les cellules qui touchent le bord INFÉRIEUR
        // Tolérance augmentée à 0.05 (5cm) pour gérer les cas où splitRatios ne somment pas à 100%
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

        if (sortedBottomColumns.length > 1) {
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

        // DEBUG: Log bottom panel creation
        console.log('🔵 BOTTOM PANEL DEBUG:', {
            allCellsCount: allCells.length,
            allCellsX: allCells.map(c => ({ x: c.x.toFixed(4), y: c.y.toFixed(4), bottom: (c.y - c.height/2).toFixed(4) })),
            minY: minY.toFixed(4),
            bottomTouchingCells: bottomTouchingCells.map(c => ({ x: c.x.toFixed(4), key: Math.round(c.x * 1000) })),
            uniqueKeys: Array.from(uniqueBottomColumns.keys()),
            sortedBottomColumnsLength: sortedBottomColumns.length,
            bottomSegments: bottomSegments.map(s => ({ id: s.id, x: s.x.toFixed(4), width: s.width.toFixed(4) }))
        });

        // Pour le panneau gauche - segmenter selon les rangées de premier niveau
        // Tolérance augmentée à 0.05 (5cm) pour gérer les cas où splitRatios ne somment pas à 100%
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

        const sortedLeftRows = Array.from(uniqueLeftRows.entries())
            .sort(([keyA], [keyB]) => keyB - keyA); // Tri descendant pour Y (haut en premier)

        if (sortedLeftRows.length > 1) {
            sortedLeftRows.forEach(([, cells], index) => {
                const cell = cells[0];
                const isTopmost = index === 0;
                const isBottommost = index === sortedLeftRows.length - 1;

                let segY = cell.y;
                let segHeight = cell.height;

                if (isTopmost) {
                    segHeight += thickness;
                    segY += thickness / 2;
                }
                if (isBottommost) {
                    // Étendre jusqu'au socle (yOffset)
                    const cellBottom = cell.y - cell.height / 2;
                    const gapToBottom = cellBottom - yOffset;
                    const extensionBottom = Math.max(thickness, gapToBottom + 0.001);
                    segHeight += extensionBottom;
                    segY -= extensionBottom / 2;
                }

                leftSegments.push({
                    id: `panel-left-${index}`,
                    x: -w / 2 + thickness / 2,
                    y: segY,
                    width: thickness,
                    height: segHeight
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

        // Pour le panneau droit - segmenter selon les rangées de premier niveau
        // Tolérance augmentée à 0.05 (5cm) pour gérer les cas où splitRatios ne somment pas à 100%
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
            .sort(([keyA], [keyB]) => keyB - keyA); // Tri descendant pour Y (haut en premier)

        if (sortedRightRows.length > 1) {
            sortedRightRows.forEach(([, cells], index) => {
                const cell = cells[0];
                const isTopmost = index === 0;
                const isBottommost = index === sortedRightRows.length - 1;

                let segY = cell.y;
                let segHeight = cell.height;

                if (isTopmost) {
                    segHeight += thickness;
                    segY += thickness / 2;
                }
                if (isBottommost) {
                    // Étendre jusqu'au socle (yOffset)
                    const cellBottom = cell.y - cell.height / 2;
                    const gapToBottom = cellBottom - yOffset;
                    const extensionBottom = Math.max(thickness, gapToBottom + 0.001);
                    segHeight += extensionBottom;
                    segY -= extensionBottom / 2;
                }

                rightSegments.push({
                    id: `panel-right-${index}`,
                    x: w / 2 - thickness / 2,
                    y: segY,
                    width: thickness,
                    height: segHeight
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

        // DEBUG: Log séparateurs
        console.log('ThreeCanvas - Separators:', allSeparators.map((sep) =>
            `${sep.orientation === 'vertical' ? 'V' : 'H'}[${sep.path}] at ${sep.orientation === 'vertical' ? `x=${sep.x.toFixed(2)}` : `y=${sep.y.toFixed(2)}`}`
        ));

        // Utiliser les limites réelles des cellules pour les séparateurs aussi
        // (déjà calculées ci-dessus : minCellY, maxCellY, minCellX, maxCellX)

        // Créer les segments des séparateurs
        allSeparators.forEach((sep, i) => {
            // Pour chaque séparateur, on peut le segmenter selon les cellules qu'il borde
            // Pour simplifier, on crée un segment pour chaque portion du séparateur

            if (sep.orientation === 'vertical') {
                // Vérifier si le séparateur lui-même touche les bords ABSOLUS du meuble
                // Utiliser une tolérance plus grande (0.05) pour éviter les erreurs de virgule flottante
                const sepBottom = sep.y - sep.height / 2;
                const sepTop = sep.y + sep.height / 2;
                const sepTouchesFurnitureTop = sepTop >= furnitureTopInner - 0.05;
                const sepTouchesFurnitureBottom = sepBottom <= furnitureBottomInner + 0.05;

                // DEBUG: Afficher les valeurs pour diagnostic
                console.log(`Separator ${sep.path}: bottom=${sepBottom.toFixed(4)}, furnitureBottomInner=${furnitureBottomInner.toFixed(4)}, touches=${sepTouchesFurnitureBottom}`);

                // Trouver toutes les cellules à gauche de ce séparateur
                // Utiliser une tolérance plus grande pour capturer les cellules adjacentes
                const adjacentCells = allCells.filter(cell =>
                    Math.abs((cell.x + cell.width / 2) - (sep.x - thickness / 2)) < 0.05
                );

                console.log(`Separator ${sep.path}: found ${adjacentCells.length} adjacent cells`);

                if (adjacentCells.length > 0) {
                    // Grouper par Y
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
                            // Utiliser directement les positions du séparateur pour assurer l'alignement
                            let segY = sep.y;
                            let segHeight = sep.height;

                            // Étendre vers le haut si le séparateur touche le haut du meuble
                            if (sepTouchesFurnitureTop) {
                                // Calculer l'extension exacte nécessaire pour atteindre le haut
                                const gapToTop = furnitureTopInner - sepTop;
                                const extensionTop = thickness + Math.max(0, gapToTop);
                                segHeight += extensionTop;
                                segY += extensionTop / 2;
                            }
                            // Étendre vers le bas si le séparateur touche le bas du meuble
                            if (sepTouchesFurnitureBottom) {
                                // Calculer l'extension exacte nécessaire pour atteindre le bas (yOffset = haut du socle)
                                const gapToBottom = sepBottom - yOffset;
                                const extensionBottom = Math.max(thickness, gapToBottom + 0.001); // +0.001 pour s'assurer de la couverture
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
                    // Pas de cellules adjacentes, utiliser les dimensions du séparateur
                    let segY = sep.y;
                    let segHeight = sep.height;

                    // Étendre jusqu'aux bords du meuble si le séparateur les touche
                    if (sepTouchesFurnitureTop) {
                        const gapToTop = furnitureTopInner - sepTop;
                        const extensionTop = thickness + Math.max(0, gapToTop);
                        segHeight += extensionTop;
                        segY += extensionTop / 2;
                    }
                    if (sepTouchesFurnitureBottom) {
                        // Calculer l'extension exacte nécessaire pour atteindre le bas (yOffset = haut du socle)
                        const gapToBottom = sepBottom - yOffset;
                        const extensionBottom = Math.max(thickness, gapToBottom + 0.001);
                        segHeight += extensionBottom;
                        segY -= extensionBottom / 2;
                    }

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
                // Séparateur horizontal
                // Limites gauche/droite du meuble
                const furnitureLeftInner = -innerWidth / 2;
                const furnitureRightInner = innerWidth / 2;

                // Vérifier si le séparateur lui-même touche les bords du meuble
                const sepTouchesFurnitureLeft = sep.x - sep.width / 2 <= furnitureLeftInner + 0.05;
                const sepTouchesFurnitureRight = sep.x + sep.width / 2 >= furnitureRightInner - 0.05;

                const adjacentCells = allCells.filter(cell =>
                    Math.abs((cell.y - cell.height / 2) - (sep.y + thickness / 2)) < 0.05
                );

                if (adjacentCells.length > 0) {
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

                            // Vérifier si la cellule touche les bords ABSOLUS du meuble
                            const touchesFurnitureLeft = cell.x - cell.width / 2 <= furnitureLeftInner + 0.01;
                            const touchesFurnitureRight = cell.x + cell.width / 2 >= furnitureRightInner - 0.01;

                            // Vérifier si c'est la première/dernière colonne dans le groupe
                            const isFirstInGroup = j === 0;
                            const isLastInGroup = j === sortedCols.length - 1;

                            // Étendre vers la gauche si:
                            // - La cellule touche le bord gauche du meuble, OU
                            // - C'est une colonne unique (pas de colonnes adjacentes à gauche)
                            if (touchesFurnitureLeft || (isSingleColumn && isFirstInGroup)) {
                                segWidth += thickness;
                                segX -= thickness / 2;
                            }
                            // Étendre vers la droite si:
                            // - La cellule touche le bord droit du meuble, OU
                            // - C'est une colonne unique (pas de colonnes adjacentes à droite)
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
                    // Pas de cellules adjacentes, utiliser les dimensions du séparateur
                    let segX = sep.x;
                    let segWidth = sep.width;

                    // Étendre jusqu'aux bords du meuble si le séparateur les touche
                    if (sepTouchesFurnitureLeft) {
                        segWidth += thickness;
                        segX -= thickness / 2;
                    }
                    if (sepTouchesFurnitureRight) {
                        segWidth += thickness;
                        segX += thickness / 2;
                    }

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

        // Log des segments séparateurs créés
        console.log('ThreeCanvas - Separator segments:', separatorSegments.map(s => s.id));

        // Fallback pour le panneau arrière si aucun segment n'a été créé
        if (backSegments.length === 0) {
            backSegments.push({ id: 'panel-back-c0-r0', x: 0, y: sideHeight/2 + yOffset, width: w, height: sideHeight, colIndex: 0, rowIndex: 0 });
        }

        return { topSegments, bottomSegments, leftSegments, rightSegments, backSegments, separatorSegments };
    }, [rootZone, w, h, sideHeight, yOffset, thickness]);


    const elements = useMemo(() => {
        const items: React.ReactNode[] = [];
        if (!rootZone) return items;

        // Debug: afficher la rootZone reçue
        // console.log('🎨 ThreeCanvas - rootZone reçue:', JSON.stringify(rootZone, null, 2));
        // console.log('🎨 ThreeCanvas - rootZone.type:', rootZone.type);
        // console.log('🎨 ThreeCanvas - rootZone.children:', rootZone.children?.length || 0, 'enfants');

        const parseZone = (zone: Zone, x: number, y: number, z: number, width: number, height: number, isAtTop: boolean = true, isAtBottom: boolean = true, hasDoorInFront: boolean = false, isAtLeft: boolean = true, isAtRight: boolean = true) => {
            // Calcul du débordement pour les portes en mode appliqué
            // On n'applique le débordement que sur les bords externes du meuble
            const topOverlap = isAtTop ? doorOverlap : 0;
            const bottomOverlap = isAtBottom ? doorOverlap : 0;
            const totalDoorOverlap = topOverlap + bottomOverlap;
            const doorYOffset = (topOverlap - bottomOverlap) / 2;
            const leftOverlap = isAtLeft ? doorOverlap : 0;
            const rightOverlap = isAtRight ? doorOverlap : 0;
            const doorZoneWidth = width + leftOverlap + rightOverlap;
            const doorXOffset = (rightOverlap - leftOverlap) / 2;
            if (zone.type === 'leaf') {
                // Si c'est un espace ouvert, ne pas ajouter de contenu ni de hitbox normale
                if (zone.isOpenSpace) {
                    // Hitbox transparente pour pouvoir sélectionner l'espace ouvert
                    items.push(
                        <mesh
                            key={`${zone.id}-hitbox`}
                            position={[x, y, 0]}
                            visible={true}
                            onPointerOver={(e) => {
                                e.stopPropagation();
                                document.body.style.cursor = 'pointer';
                            }}
                            onPointerOut={() => {
                                document.body.style.cursor = 'default';
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectZone?.(zone.id);
                            }}
                        >
                            <boxGeometry args={[width + 0.002, height + 0.002, d + 0.002]} />
                            <meshBasicMaterial
                                transparent
                                opacity={selectedZoneIds.includes(zone.id) ? 0.3 : 0.01}
                                color="#4CAF50"
                                depthWrite={false}
                                toneMapped={false}
                            />
                            {selectedZoneIds.includes(zone.id) && (
                                <>
                                    <mesh>
                                        <boxGeometry args={[width + 0.002, height + 0.002, d + 0.002]} />
                                        <meshBasicMaterial color="#4CAF50" wireframe transparent opacity={0.4} toneMapped={false} />
                                    </mesh>
                                    <lineSegments>
                                        <edgesGeometry args={[new THREE.BoxGeometry(width + 0.002, height + 0.002, d + 0.002)]} />
                                        <lineBasicMaterial color="#4CAF50" linewidth={4} toneMapped={false} />
                                    </lineSegments>
                                </>
                            )}
                        </mesh>
                    );
                    return; // Ne pas continuer - c'est un espace ouvert
                }

                // Ajouter l'éclairage si activé
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

                // Ajouter le passe-câble si activé
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

                // Hitbox de sélection pour toutes les zones leaf
                // En mode encastré, réduire la hitbox si derrière une porte pour ne pas bloquer le clic sur la porte
                const hitboxBehindDoor = hasDoorInFront || !!zone.doorContent;
                // Réduire la hitbox quand derrière une porte pour ne pas intercepter les clics
                const hitboxRecess = hitboxBehindDoor ? 0.005 : 0;
                const hitboxDepth = d - hitboxRecess + 0.002;
                const hitboxZ = -hitboxRecess / 2;
                items.push(
                    <mesh
                        key={`${zone.id}-hitbox`}
                        position={[x, y, hitboxZ]}
                        visible={true}
                        onPointerOver={(e) => {
                            e.stopPropagation();
                            document.body.style.cursor = 'pointer';
                        }}
                        onPointerOut={() => {
                            document.body.style.cursor = 'default';
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            // On appelle onSelectZone avec l'id de la zone.
                            onSelectZone?.(zone.id);

                            // On bascule l'ouverture si c'est un compartiment mobile
                            if (zone.content === 'drawer' || zone.content === 'push_drawer' || zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double' || zone.content === 'push_door' || zone.content === 'push_door_right' || zone.content === 'mirror_door' || zone.content === 'mirror_door_right') {
                                toggleCompartment(zone.id);
                            }
                        }}
                    >
                        <boxGeometry args={[width + 0.002, height + 0.002, hitboxDepth]} />
                        <meshBasicMaterial
                            transparent
                            opacity={selectedZoneIds.includes(zone.id) ? 0.5 : 0.01}
                            color="#FF9800"
                            depthWrite={false}
                            toneMapped={false}
                        />
                        {selectedZoneIds.includes(zone.id) && (
                            <>
                                {/* Grillage (Wireframe) pour effet de sélection */}
                                <mesh>
                                    <boxGeometry args={[width + 0.002, height + 0.002, hitboxDepth]} />
                                    <meshBasicMaterial color="#FF9800" wireframe transparent opacity={0.4} toneMapped={false} />
                                </mesh>
                                {/* Bordures plus marquées */}
                                <lineSegments>
                                    <edgesGeometry args={[new THREE.BoxGeometry(width + 0.002, height + 0.002, hitboxDepth)]} />
                                    <lineBasicMaterial color="#FF9800" linewidth={4} toneMapped={false} />
                                </lineSegments>
                            </>
                        )}
                    </mesh>
                );

                if (zone.content === 'shelf') {
                    const behindDoor = hasDoorInFront || !!zone.doorContent;
                    const shelfDepth = behindDoor && doorRecess > 0 ? d - doorRecess : d;
                    const shelfZ = behindDoor && doorRecess > 0 ? z - doorRecess / 2 : z;
                    items.push(
                        <mesh key={zone.id} position={[x, y, shelfZ]} castShadow receiveShadow>
                            <boxGeometry args={[width, thickness, shelfDepth]} />
                            <TexturedMaterial hexColor={finalShelfColor} imageUrl={finalShelfImageUrl} />
                        </mesh>
                    );
                    // Ajouter des décorations sur l'étagère
                    if (showDecorations) {
                        items.push(
                            <group key={`${zone.id}-deco`} position={[x, y + thickness/2, shelfZ]}>
                                <ShelfDecoration width={width} height={height} depth={shelfDepth} seed={zone.id} />
                            </group>
                        );
                    }
                } else if (zone.content === 'drawer') {
                    // Utiliser la couleur spécifique de la zone si disponible
                    const drawerHexColor = zone.zoneColor?.hex || finalDrawerColor;
                    const drawerImageUrl = zone.zoneColor?.imageUrl !== undefined ? zone.zoneColor.imageUrl : finalDrawerImageUrl;
                    items.push(
                        <AnimatedDrawer
                            key={zone.id}
                            position={[x + doorXOffset, y + doorYOffset, d / 2 + mountingOffset + 0.009]}
                            width={doorZoneWidth - compartmentGap}
                            height={height - compartmentGap + totalDoorOverlap}
                            depth={d}
                            hexColor={drawerHexColor}
                            imageUrl={drawerImageUrl}
                            handleType={zone.handleType}
                            isOpen={openCompartments[zone.id]}
                            onClick={(e: any) => {
                                e.stopPropagation();
                                onSelectZone?.(zone.id);
                                toggleCompartment(zone.id);
                            }}
                        />
                    );
                } else if (zone.content === 'push_drawer') {
                    // Tiroir push-to-open sans poignée - utiliser la couleur spécifique de la zone si disponible
                    const drawerHexColor = zone.zoneColor?.hex || finalDrawerColor;
                    const drawerImageUrl = zone.zoneColor?.imageUrl !== undefined ? zone.zoneColor.imageUrl : finalDrawerImageUrl;
                    items.push(
                        <AnimatedPushDrawer
                            key={zone.id}
                            position={[x + doorXOffset, y + doorYOffset, d / 2 + mountingOffset + 0.009]}
                            width={doorZoneWidth - compartmentGap}
                            height={height - compartmentGap + totalDoorOverlap}
                            depth={d}
                            hexColor={drawerHexColor}
                            imageUrl={drawerImageUrl}
                            isOpen={openCompartments[zone.id]}
                            onClick={(e: any) => {
                                e.stopPropagation();
                                onSelectZone?.(zone.id);
                                toggleCompartment(zone.id);
                            }}
                        />
                    );
                }

                // Rendu de la penderie (Dressing) - Indépendant du contenu principal
                if (zone.hasDressing || zone.content === 'dressing') {
                    items.push(
                        <mesh key={`${zone.id}-dressing`} position={[x, y + height / 2 - 0.05, z]} rotation={[0, 0, Math.PI / 2]}>
                            <cylinderGeometry args={[0.01, 0.01, width - 0.02, 16]} />
                            <meshStandardMaterial color="#aaa" metalness={0.9} />
                        </mesh>
                    );
                }

                // Rendu des portes (Indépendant du type de zone : feuille ou parent)
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
                            <group key={`${zone.id}-door`} position={[x + doorXOffset, y + doorYOffset, d/2 + mountingOffset]}>
                                <AnimatedMirrorDoor
                                    side={isMirrorRight ? "right" : "left"}
                                    position={[isMirrorRight ? (doorZoneWidth/2 - compartmentGap/2) : (-doorZoneWidth/2 + compartmentGap/2), 0, 0]}
                                    width={doorZoneWidth - compartmentGap}
                                    height={height - compartmentGap + totalDoorOverlap}
                                    handleType={zone.handleType}
                                    isOpen={openCompartments[zone.id]}
                                    onClick={() => {
                                        toggleCompartment(zone.id);
                                        onSelectZone?.(selectedZoneIds.includes(zone.id) ? null : zone.id);
                                    }}
                                />
                            </group>
                        );
                    } else if (isPush) {
                        items.push(
                            <group key={`${zone.id}-door`} position={[x + doorXOffset, y + doorYOffset, d/2 + mountingOffset]}>
                                <AnimatedPushDoor
                                    side={isPushRight ? "right" : "left"}
                                    position={[isPushRight ? (doorZoneWidth/2 - compartmentGap/2) : (-doorZoneWidth/2 + compartmentGap/2), 0, 0]}
                                    width={doorZoneWidth - compartmentGap}
                                    height={height - compartmentGap + totalDoorOverlap}
                                    hexColor={doorHexColor}
                                    imageUrl={doorImageUrl}
                                    isOpen={openCompartments[zone.id]}
                                    onClick={(e: any) => {
                                        e.stopPropagation();
                                        onSelectZone?.(zone.id);
                                        toggleCompartment(zone.id);
                                    }}
                                />
                            </group>
                        );
                    } else {
                        items.push(
                            <group key={`${zone.id}-door`} position={[x + doorXOffset, y + doorYOffset, d/2 + mountingOffset]}>
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
                                        onClick={(e: any) => {
                                            e.stopPropagation();
                                            onSelectZone?.(zone.id);
                                        }}
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
                                        onClick={(e: any) => {
                                            e.stopPropagation();
                                            onSelectZone?.(zone.id);
                                        }}
                                    />
                                )}
                            </group>
                        );
                    }
                }

                if (zone.content === 'glass_shelf') {
                    // Étagère en verre transparente
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
                } else if (zone.content === 'mirror_door' || zone.content === 'mirror_door_right') {
                    // Porte avec miroir
                    const isMirrorRightLeaf = zone.content === 'mirror_door_right';
                    items.push(
                        <group key={zone.id} position={[x + doorXOffset, y + doorYOffset, d/2 + mountingOffset]}>
                            <AnimatedMirrorDoor
                                side={isMirrorRightLeaf ? "right" : "left"}
                                position={[isMirrorRightLeaf ? (doorZoneWidth/2 - compartmentGap/2) : (-doorZoneWidth/2 + compartmentGap/2), 0, 0]}
                                width={doorZoneWidth - compartmentGap}
                                height={height - compartmentGap + totalDoorOverlap}
                                handleType={zone.handleType}
                                isOpen={openCompartments[zone.id]}
                                onClick={(e: any) => {
                                    e.stopPropagation();
                                    onSelectZone?.(zone.id);
                                    toggleCompartment(zone.id);
                                }}
                            />
                        </group>
                    );
                } else {
                    // Niche vide : Ajouter des décorations au fond de la niche
                    if (showDecorations) {
                        items.push(
                            <group key={`${zone.id}-deco`} position={[x, y - height/2 + thickness/2, z]}>
                                <ShelfDecoration width={width} height={height} depth={d} seed={zone.id} />
                            </group>
                        );
                    }
                }
            }

            // --- Gestion des Portes sur les Groupes ---
            // Si la zone a des enfants (groupe) et qu'elle a un contenu de type porte
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
                        <group key={`${zone.id}-group-door`} position={[x + doorXOffset, y + doorYOffset, d/2 + mountingOffset]}>
                            <AnimatedMirrorDoor
                                side={isMirrorRightGroup ? "right" : "left"}
                                position={[isMirrorRightGroup ? (doorZoneWidth/2 - compartmentGap/2) : (-doorZoneWidth/2 + compartmentGap/2), 0, 0]}
                                width={doorZoneWidth - compartmentGap}
                                height={height - compartmentGap + totalDoorOverlap}
                                handleType={zone.handleType}
                                isOpen={openCompartments[zone.id]}
                                onClick={(e: any) => {
                                    e.stopPropagation();
                                    onSelectZone?.(zone.id);
                                    toggleCompartment(zone.id);
                                }}
                            />
                        </group>
                    );
                } else if (isPush) {
                    items.push(
                        <group key={`${zone.id}-group-door`} position={[x + doorXOffset, y + doorYOffset, d/2 + mountingOffset]}>
                            <AnimatedPushDoor
                                side={isPushRightGroup ? "right" : "left"}
                                position={[isPushRightGroup ? (doorZoneWidth/2 - compartmentGap/2) : (-doorZoneWidth/2 + compartmentGap/2), 0, 0]}
                                width={doorZoneWidth - compartmentGap}
                                height={height - compartmentGap + totalDoorOverlap}
                                hexColor={doorHexColor}
                                imageUrl={doorImageUrl}
                                isOpen={openCompartments[zone.id]}
                                onClick={(e: any) => {
                                    e.stopPropagation();
                                    onSelectZone?.(zone.id);
                                    toggleCompartment(zone.id);
                                }}
                            />
                        </group>
                    );
                } else {
                    items.push(
                        <group key={`${zone.id}-group-door`} position={[x + doorXOffset, y + doorYOffset, d/2 + mountingOffset]}>
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
                                    onClick={(e: any) => {
                                        e.stopPropagation();
                                        onSelectZone?.(zone.id);
                                        toggleCompartment(zone.id);
                                    }}
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
                                    onClick={(e: any) => {
                                        e.stopPropagation();
                                        onSelectZone?.(zone.id);
                                        toggleCompartment(zone.id);
                                    }}
                                />
                            )}
                        </group>
                    );
                }
            }

            if (zone.children && zone.children.length > 0) {
                console.log('🎨 parseZone - zone avec enfants:', zone.id, 'type:', zone.type, 'enfants:', zone.children.length);
                // Déterminer si cette zone a une porte de groupe (pour la propager aux enfants)
                const zoneDoorContent = zone.doorContent || zone.content;
                const zoneHasDoor = hasDoorInFront || !!(zoneDoorContent && typeof zoneDoorContent === 'string' && zoneDoorContent.includes('door'));
                let currentPos = 0;
                zone.children.forEach((child, i) => {
                    // Calcul du ratio pour chaque enfant
                    let ratio: number;
                    if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
                        // Ratios explicites pour chaque enfant
                        ratio = zone.splitRatios[i] / 100;
                    } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
                        // Mode splitRatio pour exactement 2 enfants
                        ratio = (i === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
                    } else {
                        // Par défaut: distribution égale
                        ratio = 1 / zone.children!.length;
                    }
                    console.log('🎨 parseZone - enfant', i, 'ratio:', ratio);

                    if (zone.type === 'horizontal') {
                        const childHeight = height * ratio;
                        // Rendu de haut en bas pour correspondre à l'UI 2D (index 0 = haut)
                        // Pour les splits horizontaux:
                        // - Premier enfant (i=0) est en haut: hérite isAtTop du parent, isAtBottom = false (sauf si c'est le seul enfant)
                        // - Dernier enfant est en bas: isAtTop = false (sauf si c'est le seul enfant), hérite isAtBottom du parent
                        // - Tous héritent isAtLeft/isAtRight du parent
                        const isFirst = i === 0;
                        const isLast = i === zone.children!.length - 1;
                        const childIsAtTop = isFirst ? isAtTop : false;
                        const childIsAtBottom = isLast ? isAtBottom : false;
                        parseZone(child, x, (y + height/2) - currentPos - childHeight/2, z, width, childHeight, childIsAtTop, childIsAtBottom, zoneHasDoor, isAtLeft, isAtRight);
                        currentPos += childHeight;
                        // Note: Les séparateurs visuels sont maintenant rendus via panelSegments.separatorSegments
                        // pour permettre la suppression individuelle de chaque segment
                    } else {
                        const childWidth = width * ratio;
                        // Pour les splits verticaux: les enfants héritent isAtTop et isAtBottom du parent
                        // Premier enfant (gauche) hérite isAtLeft, dernier (droite) hérite isAtRight
                        const isFirst = i === 0;
                        const isLast = i === zone.children!.length - 1;
                        const childIsAtLeft = isFirst ? isAtLeft : false;
                        const childIsAtRight = isLast ? isAtRight : false;
                        parseZone(child, x - width/2 + currentPos + childWidth/2, y, z, childWidth, height, isAtTop, isAtBottom, zoneHasDoor, childIsAtLeft, childIsAtRight);
                        currentPos += childWidth;
                        // Note: Les séparateurs visuels sont maintenant rendus via panelSegments.separatorSegments
                        // pour permettre la suppression individuelle de chaque segment
                    }
                });
            }
        };

        parseZone(rootZone, 0, sideHeight/2 + yOffset, 0, w - (thickness * 2), sideHeight - (thickness * 2));
        return items;
    }, [
        rootZone, w, sideHeight, yOffset, thickness, compartmentGap, mountingOffset, doorOverlap, doorRecess, d,
        finalStructureColor, finalShelfColor, finalDrawerColor, finalDoorColor, finalBackColor, finalBaseColor,
        finalStructureImageUrl, finalShelfImageUrl, finalDrawerImageUrl, finalDoorImageUrl, finalBackImageUrl, finalBaseImageUrl,
        separatorColor, separatorImageUrl,
        openCompartments, showDecorations, selectedZoneIds, onSelectZone, toggleCompartment,
        selectedPanelIds, onSelectPanel
    ]);

    // Note: On n'utilise plus de key={colorKey} car cela causait des remontages
    // et des flashs blancs lors des changements de couleur

    // Callback pour la sélection de panneaux (désélectionne les zones si on sélectionne un panneau)
    const handlePanelSelect = useCallback((panelId: string | null) => {
        if (panelId && onSelectZone) {
            onSelectZone(null); // Désélectionner les zones
        }
        onSelectPanel?.(panelId);
    }, [onSelectPanel, onSelectZone]);

    return (
        <group>
            {/* Panneau gauche - rendu segment par segment pour permettre la suppression individuelle */}
            {panelSegments.leftSegments.map((segment) => (
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
            {/* Hitbox de sélection par segment pour le panneau gauche */}
            {panelSegments.leftSegments.map((segment) => (
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

            {/* Panneau droit - rendu segment par segment pour permettre la suppression individuelle */}
            {panelSegments.rightSegments.map((segment) => (
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
            {/* Hitbox de sélection par segment pour le panneau droit */}
            {panelSegments.rightSegments.map((segment) => (
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

            {/* Panneau supérieur - rendu segment par segment pour permettre la suppression individuelle */}
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
            {/* Hitbox de sélection par segment pour le panneau supérieur */}
            {panelSegments.topSegments.map((segment) => (
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

            {/* Décorations sur le dessus */}
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

            {/* Panneau inférieur - rendu segment par segment pour permettre la suppression individuelle */}
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
            {/* Hitbox de sélection par segment pour le panneau inférieur */}
            {panelSegments.bottomSegments.map((segment) => (
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

            {/* Séparateurs - rendu segment par segment pour permettre la suppression individuelle */}
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
            {/* Hitbox de sélection par segment pour les séparateurs */}
            {panelSegments.separatorSegments.map((segment) => {
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

            {/* Dynamic Elements */}
            {elements}

            {/* Doors with Animation - Only render if no zone-specific doors */}
            {rootZone && doorType !== 'none' && !hasZoneSpecificDoors && (
                <group position={[0, sideHeight/2 + yOffset, d/2]}>
                    {(doorType === 'double' || (doorType === 'single' && doorSide === 'left')) && (
                        <AnimatedDoor
                            side="left"
                            position={[-w/2, 0, 0]}
                            width={doorType === 'double' ? w/2 : w}
                            height={sideHeight}
                            hexColor={finalDoorColor}
                            imageUrl={finalDoorImageUrl}
                            isOpen={doorsOpen}
                            onClick={() => {
                                onToggleDoors?.();
                                onSelectZone?.(selectedZoneIds.includes('root') ? null : 'root');
                            }}
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
                            onClick={() => {
                                onToggleDoors?.();
                                onSelectZone?.(selectedZoneIds.includes('root') ? null : 'root');
                            }}
                        />
                    )}
                </group>
            )}

            {/* Click Detector for Doors (invisible large area) - Only render if no zone-specific doors */}
            {/* We keep it as a fallback for when clicking between doors or for the root selection if doors are closed */}
            {doorType !== 'none' && !hasZoneSpecificDoors && (
                <mesh
                    position={[0, sideHeight/2 + yOffset, d/2 + 0.01]}
                    visible={false}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleDoors?.();
                        onSelectZone?.(selectedZoneIds.includes('root') ? null : 'root');
                    }}
                >
                    <boxGeometry args={[w, sideHeight, 0.02]} />
                </mesh>
            )}

            {/* Socle */}
            {hasSocle && (
                <>
                    {socle === 'metal' ? (
                        <group position={[0, 0, 0]}>
                            {/* Pieds métal */}
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
                        /* Socle plein (bois) - segmenté selon les colonnes du bas */
                        <group>
                            {panelSegments.bottomSegments.map((segment, index) => {
                                if (deletedPanelIds.has(segment.id)) return null;

                                // Étendre le socle pour couvrir les espaces des séparateurs
                                const isFirst = index === 0;
                                const isLast = index === panelSegments.bottomSegments.length - 1;
                                const separatorGap = thickness; // Épaisseur du séparateur vertical

                                let socleX = segment.x;
                                let socleWidth = segment.width;

                                // Étendre vers la droite pour couvrir le séparateur (sauf dernier segment)
                                if (!isLast) {
                                    socleWidth += separatorGap / 2;
                                    socleX += separatorGap / 4;
                                }
                                // Étendre vers la gauche pour couvrir le séparateur (sauf premier segment)
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

            {/* Back Panel - avec gestion des espaces ouverts */}
            {openSpaceInfo.length === 0 ? (
                // Pas d'espaces ouverts : panneaux segmentés avec suppression individuelle
                <>
                    {/* Panneaux arrière visuels par segment (peuvent être supprimés individuellement) */}
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
                    {/* Hitbox de sélection par segment pour le panneau arrière */}
                    {panelSegments.backSegments.map((segment) => (
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
                // Avec espaces ouverts : générer des panneaux qui évitent les zones ouvertes
                // Note: Pour simplifier, le back panel avec ouvertures n'est pas sélectionnable pour l'instant
                <group
                    onClick={(e) => {
                        e.stopPropagation();
                        handlePanelSelect(selectedPanelIds.has('panel-back') ? null : 'panel-back');
                    }}
                    onPointerOver={(e) => {
                        e.stopPropagation();
                        document.body.style.cursor = 'pointer';
                    }}
                    onPointerOut={() => {
                        document.body.style.cursor = 'default';
                    }}
                >
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
                            <meshBasicMaterial color="#2196F3" wireframe transparent opacity={0.5} toneMapped={false} />
                        </mesh>
                    )}
                </group>
            )}
        </group>
    );
}


const ThreeCanvas = forwardRef<ThreeCanvasHandle, ThreeViewerProps>((props, ref) => {
    const { onSelectZone } = props;
    const captureRef = useRef<(() => string | null) | null>(null);

    // Exposer la méthode de capture via la ref
    useImperativeHandle(ref, () => ({
        captureScreenshot: () => {
            if (captureRef.current) {
                return captureRef.current();
            }
            return null;
        }
    }), []);

    const handleCapture = (fn: () => string | null) => {
        captureRef.current = fn;
    };

    return (
        <div style={{ width: '100%', height: '100%', background: '#FAFAF9', position: 'relative' }}>
            <Canvas
                shadows
                dpr={[1, 2]}
                camera={{ position: [4, 2.5, 5], fov: 35 }}
                onPointerMissed={() => onSelectZone?.(null)}
                onCreated={({ gl }) => {
                    gl.setClearColor('#FAFAF9');
                    gl.toneMapping = THREE.ACESFilmicToneMapping;
                    gl.toneMappingExposure = 1.1;
                }}
                gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
            >
                {/* Screenshot capture temporairement désactivé pour éviter les erreurs SSR */}
                {/* <ScreenshotCapture onCapture={handleCapture} /> */}
                <OrbitControls
                    enableDamping
                    minDistance={1.5}
                    maxDistance={10}
                    maxPolarAngle={Math.PI / 2 - 0.05}
                    target={[0, 0.8, 0]}
                />
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
                        imageUrl={props.imageUrl}
                    />
                    <HumanSilhouette />
                    <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={15} blur={2.5} far={1.5} />
                    <Environment preset="city" background={false} />
                </Suspense>
            </Canvas>
        </div>
    );
});

ThreeCanvas.displayName = 'ThreeCanvas';

export default ThreeCanvas;

