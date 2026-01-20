import { useMemo, useCallback } from 'react';
import { Zone, PANEL_META, PanelType } from './types';

interface PanelPlanCanvasProps {
    zone: Zone;
    width: number;
    height: number;
    selectedPanelId: string | null;
    onSelectPanel: (panelId: string | null) => void;
    deletedPanelIds?: Set<string>;
}

// Interface pour un segment de panneau 2D
interface Panel2DSegment {
    id: string;
    type: PanelType;
    segmentIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    orientation?: 'vertical' | 'horizontal';
}

export default function PanelPlanCanvas({
    zone,
    width,
    height,
    selectedPanelId,
    onSelectPanel,
    deletedPanelIds = new Set(),
}: PanelPlanCanvasProps) {
    // Canvas dimensions
    const maxWidth = 500;
    const maxHeight = 400;
    const aspectRatio = width / height;

    let canvasWidth: number;
    let canvasHeight: number;

    if (aspectRatio > maxWidth / maxHeight) {
        canvasWidth = maxWidth;
        canvasHeight = maxWidth / aspectRatio;
    } else {
        canvasHeight = maxHeight;
        canvasWidth = maxHeight * aspectRatio;
    }

    canvasWidth = Math.max(canvasWidth, 300);
    canvasHeight = Math.max(canvasHeight, 200);

    // Épaisseur des panneaux en 2D
    const panelThickness2D = 12;
    const separatorThickness2D = 4;

    // Types correspondant exactement à ThreeCanvas
    type GridCell = { 
        x: number; 
        y: number; 
        width: number; 
        height: number; 
        colPath: number[];
        rowPath: number[];
    };
    
    type SeparatorInfo = { 
        x: number; 
        y: number; 
        width: number; 
        height: number; 
        orientation: 'vertical' | 'horizontal';
        path: string;
    };

    // Collecter les cellules - logique identique à ThreeCanvas
    const collectGridCells = useCallback((
        z: Zone, 
        x: number, 
        y: number, 
        width: number, 
        height: number,
        colPath: number[] = [],
        rowPath: number[] = []
    ): GridCell[] => {
        if (z.type === 'leaf' || !z.children || z.children.length === 0) {
            return [{ x, y, width, height, colPath, rowPath }];
        }

        const cells: GridCell[] = [];

        if (z.type === 'vertical') {
            let currentX = x;
            z.children.forEach((child, i) => {
                let ratio: number;
                if (z.splitRatios && z.splitRatios.length === z.children!.length) {
                    ratio = z.splitRatios[i] / 100;
                } else if (z.children!.length === 2 && z.splitRatio !== undefined) {
                    ratio = (i === 0 ? z.splitRatio : 100 - z.splitRatio) / 100;
                } else {
                    ratio = 1 / z.children!.length;
                }
                
                const colWidth = width * ratio;
                const childCells = collectGridCells(
                    child,
                    currentX,
                    y,
                    colWidth,
                    height,
                    [...colPath, i],
                    rowPath
                );
                cells.push(...childCells);
                currentX += colWidth;
            });
        } else if (z.type === 'horizontal') {
            let currentY = y;
            z.children.forEach((child, i) => {
                let ratio: number;
                if (z.splitRatios && z.splitRatios.length === z.children!.length) {
                    ratio = z.splitRatios[i] / 100;
                } else if (z.children!.length === 2 && z.splitRatio !== undefined) {
                    ratio = (i === 0 ? z.splitRatio : 100 - z.splitRatio) / 100;
                } else {
                    ratio = 1 / z.children!.length;
                }
                
                const rowHeight = height * ratio;
                const childCells = collectGridCells(
                    child,
                    x,
                    currentY,
                    width,
                    rowHeight,
                    colPath,
                    [...rowPath, i]
                );
                cells.push(...childCells);
                currentY += rowHeight;
            });
        }

        return cells;
    }, []);

    // Collecter les séparateurs - logique identique à ThreeCanvas
    const collectSeparators = useCallback((
        z: Zone,
        x: number,
        y: number,
        width: number,
        height: number,
        path: string = ''
    ): SeparatorInfo[] => {
        const separators: SeparatorInfo[] = [];
        
        if (!z.children || z.children.length <= 1) {
            return separators;
        }

        if (z.type === 'vertical') {
            let currentX = x;
            z.children.forEach((child, i) => {
                let ratio: number;
                if (z.splitRatios && z.splitRatios.length === z.children!.length) {
                    ratio = z.splitRatios[i] / 100;
                } else if (z.children!.length === 2 && z.splitRatio !== undefined) {
                    ratio = (i === 0 ? z.splitRatio : 100 - z.splitRatio) / 100;
                } else {
                    ratio = 1 / z.children!.length;
                }
                
                const colWidth = width * ratio;
                
                // Ajouter séparateur vertical après chaque colonne sauf la dernière
                // Path: v${i} pour correspondre à ThreeCanvas
                if (i < z.children!.length - 1) {
                    separators.push({
                        x: currentX + colWidth,
                        y: y,
                        width: separatorThickness2D,
                        height: height,
                        orientation: 'vertical',
                        path: `${path}v${i}`
                    });
                }
                
                // Récursion dans l'enfant (avec c${i} comme dans ThreeCanvas)
                const childSeparators = collectSeparators(
                    child,
                    currentX,
                    y,
                    colWidth,
                    height,
                    `${path}c${i}-`
                );
                separators.push(...childSeparators);
                
                currentX += colWidth;
            });
        } else if (z.type === 'horizontal') {
            let currentY = y;
            z.children.forEach((child, i) => {
                let ratio: number;
                if (z.splitRatios && z.splitRatios.length === z.children!.length) {
                    ratio = z.splitRatios[i] / 100;
                } else if (z.children!.length === 2 && z.splitRatio !== undefined) {
                    ratio = (i === 0 ? z.splitRatio : 100 - z.splitRatio) / 100;
                } else {
                    ratio = 1 / z.children!.length;
                }
                
                const rowHeight = height * ratio;
                
                // Ajouter séparateur horizontal après chaque ligne sauf la dernière
                // Path: h${i} pour correspondre à ThreeCanvas
                if (i < z.children!.length - 1) {
                    separators.push({
                        x: x,
                        y: currentY + rowHeight,
                        width: width,
                        height: separatorThickness2D,
                        orientation: 'horizontal',
                        path: `${path}h${i}`
                    });
                }
                
                // Récursion dans l'enfant (avec r${i} comme dans ThreeCanvas)
                const childSeparators = collectSeparators(
                    child,
                    x,
                    currentY,
                    width,
                    rowHeight,
                    `${path}r${i}-`
                );
                separators.push(...childSeparators);
                
                currentY += rowHeight;
            });
        }

        return separators;
    }, [separatorThickness2D]);

    // Calcul des segments de panneaux 2D (seulement les 4 côtés extérieurs)
    const panelSegments2D = useMemo(() => {
        const allCells = collectGridCells(zone, 0, 0, canvasWidth, canvasHeight);
        const allSeparators = collectSeparators(zone, 0, 0, canvasWidth, canvasHeight);
        const segments: Panel2DSegment[] = [];

        // Identifier les colonnes uniques pour segmenter les panneaux haut et bas
        const uniqueColumns = new Map<number, typeof allCells[0][]>();
        allCells.forEach(cell => {
            const key = Math.round(cell.x * 1000);
            if (!uniqueColumns.has(key)) {
                uniqueColumns.set(key, []);
            }
            uniqueColumns.get(key)!.push(cell);
        });
        const sortedColumns = Array.from(uniqueColumns.entries()).sort(([a], [b]) => a - b);

        // Identifier les rangées uniques pour les panneaux gauche et droit
        const leftCells = allCells.filter(cell => cell.x < 1);
        const uniqueLeftRows = new Map<number, typeof allCells[0][]>();
        leftCells.forEach(cell => {
            const key = Math.round(cell.y * 1000);
            if (!uniqueLeftRows.has(key)) {
                uniqueLeftRows.set(key, []);
            }
            uniqueLeftRows.get(key)!.push(cell);
        });
        const sortedLeftRows = Array.from(uniqueLeftRows.entries()).sort(([a], [b]) => a - b);

        const rightCells = allCells.filter(cell => cell.x + cell.width > canvasWidth - 1);
        const uniqueRightRows = new Map<number, typeof allCells[0][]>();
        rightCells.forEach(cell => {
            const key = Math.round(cell.y * 1000);
            if (!uniqueRightRows.has(key)) {
                uniqueRightRows.set(key, []);
            }
            uniqueRightRows.get(key)!.push(cell);
        });
        const sortedRightRows = Array.from(uniqueRightRows.entries()).sort(([a], [b]) => a - b);

        // Panneau gauche - segmenté selon les rangées
        if (sortedLeftRows.length > 1) {
            sortedLeftRows.forEach(([, cells], index) => {
                const cell = cells[0];
                segments.push({
                    id: `panel-left-${index}`,
                    type: 'left' as PanelType,
                    segmentIndex: index,
                    x: -panelThickness2D,
                    y: cell.y,
                    width: panelThickness2D,
                    height: cell.height,
                });
            });
        } else {
            segments.push({
                id: 'panel-left-0',
                type: 'left' as PanelType,
                segmentIndex: 0,
                x: -panelThickness2D,
                y: 0,
                width: panelThickness2D,
                height: canvasHeight,
            });
        }

        // Panneau droit - segmenté selon les rangées
        if (sortedRightRows.length > 1) {
            sortedRightRows.forEach(([, cells], index) => {
                const cell = cells[0];
                segments.push({
                    id: `panel-right-${index}`,
                    type: 'right' as PanelType,
                    segmentIndex: index,
                    x: canvasWidth,
                    y: cell.y,
                    width: panelThickness2D,
                    height: cell.height,
                });
            });
        } else {
            segments.push({
                id: 'panel-right-0',
                type: 'right' as PanelType,
                segmentIndex: 0,
                x: canvasWidth,
                y: 0,
                width: panelThickness2D,
                height: canvasHeight,
            });
        }

        // Panneau haut - segmenté selon les colonnes
        if (sortedColumns.length > 1) {
            sortedColumns.forEach(([, cells], index) => {
                const cell = cells[0];
                segments.push({
                    id: `panel-top-${index}`,
                    type: 'top' as PanelType,
                    segmentIndex: index,
                    x: cell.x,
                    y: -panelThickness2D,
                    width: cell.width,
                    height: panelThickness2D,
                });
            });
        } else {
            segments.push({
                id: 'panel-top-0',
                type: 'top' as PanelType,
                segmentIndex: 0,
                x: 0,
                y: -panelThickness2D,
                width: canvasWidth,
                height: panelThickness2D,
            });
        }

        // Panneau bas - segmenté selon les colonnes
        if (sortedColumns.length > 1) {
            sortedColumns.forEach(([, cells], index) => {
                const cell = cells[0];
                segments.push({
                    id: `panel-bottom-${index}`,
                    type: 'bottom' as PanelType,
                    segmentIndex: index,
                    x: cell.x,
                    y: canvasHeight,
                    width: cell.width,
                    height: panelThickness2D,
                });
            });
        } else {
            segments.push({
                id: 'panel-bottom-0',
                type: 'bottom' as PanelType,
                segmentIndex: 0,
                x: 0,
                y: canvasHeight,
                width: canvasWidth,
                height: panelThickness2D,
            });
        }

        // Panneau arrière (back) - segmenté selon les cellules de la grille
        // Utiliser le chemin complet pour un ID unique et stable (même format que ThreeCanvas)
        allCells.forEach((cell, i) => {
            // Utiliser le chemin complet pour un ID unique et stable
            const pathId = `c${cell.colPath.join('_')}-r${cell.rowPath.join('_')}`;
            
            segments.push({
                id: `panel-back-${pathId}`,
                type: 'back' as PanelType,
                segmentIndex: i,
                x: cell.x,
                y: cell.y,
                width: cell.width,
                height: cell.height,
            });
        });
        
        // DEBUG: Log pour vérifier la correspondance
        if (typeof window !== 'undefined') {
            console.log('PanelPlanCanvas - Back panel IDs:', allCells.map((cell) => {
                const pathId = `c${cell.colPath.join('_')}-r${cell.rowPath.join('_')}`;
                return `panel-back-${pathId}`;
            }));
        }

        // Traitement des séparateurs - segmentation comme ThreeCanvas
        // Utiliser le path du séparateur pour un ID stable
        allSeparators.forEach((sep, i) => {
            if (sep.orientation === 'vertical') {
                // Trouver les cellules adjacentes à ce séparateur
                // On cherche les cellules dont le bord droit OU le bord gauche est proche de sep.x
                // Cela capture les cellules des deux côtés du séparateur pour une meilleure segmentation
                const adjacentCells = allCells.filter(cell => {
                    const cellRight = cell.x + cell.width;
                    const cellLeft = cell.x;
                    // Cellule à gauche (bord droit proche) OU cellule à droite (bord gauche proche)
                    return Math.abs(cellRight - sep.x) < 5 || Math.abs(cellLeft - sep.x) < 5;
                });
                
                // Debug log pour ce séparateur
                if (typeof window !== 'undefined') {
                    console.log(`Sep V[${sep.path}] at x=${Math.round(sep.x)}: found ${adjacentCells.length} cells to the left`);
                    adjacentCells.forEach(c => console.log(`  - cell at y=${Math.round(c.y)}, h=${Math.round(c.height)}`));
                }
                
                if (adjacentCells.length > 0) {
                    // Grouper par Y avec haute précision (comme ThreeCanvas * 1000)
                    const uniqueRows = new Map<number, typeof allCells[0]>();
                    adjacentCells.forEach(cell => {
                        const key = Math.round(cell.y * 1000);
                        if (!uniqueRows.has(key)) {
                            uniqueRows.set(key, cell);
                        }
                    });
                    
                    // IMPORTANT: En 3D (ThreeCanvas), le tri est b.y - a.y (Y décroissant, haut en premier car Y+ est vers le haut)
                    // En 2D CSS, Y+ est vers le bas, donc pour que j=0 corresponde au MÊME segment visuellement,
                    // on doit aussi trier par Y décroissant (b.y - a.y) car les deux systèmes assignent j=0 au premier élément trié
                    // Mais en CSS, Y grand = bas, donc j=0 sera en bas visuellement avec b.y - a.y
                    // 
                    // Pour correspondre à ThreeCanvas où j=0 = haut (Y grand en 3D):
                    // - En 3D: tri b.y - a.y → j=0 = Y max = visuellement en haut
                    // - En CSS: pour j=0 = visuellement en haut, on doit trier a.y - b.y car Y min = visuellement en haut
                    //
                    // MAIS le problème est que les VALEURS absolues sont différentes!
                    // ThreeCanvas assigne j=0,1,2 en partant du haut (Y décroissant en 3D)
                    // Donc j=0 = segment du haut, j=1 = segment du milieu, etc.
                    // En CSS, pour garder cette correspondance: j=0 = segment du haut = Y min
                    // Donc on doit trier a.y - b.y (Y croissant) pour que j=0 = Y min = haut en CSS
                    const sortedRows = Array.from(uniqueRows.values()).sort((a, b) => a.y - b.y);
                    
                    if (typeof window !== 'undefined') {
                        console.log(`  -> ${sortedRows.length} unique rows, creating ${sortedRows.length} segments with IDs:`,
                            sortedRows.map((_, j) => `separator-v-${sep.path}-${j}`));
                    }
                    
                    // Créer un segment pour chaque ligne unique
                    sortedRows.forEach((cell, j) => {
                        segments.push({
                            id: `separator-v-${sep.path}-${j}`,
                            type: 'separator' as PanelType,
                            segmentIndex: i,
                            x: sep.x - separatorThickness2D / 2,
                            y: cell.y,
                            width: separatorThickness2D,
                            height: cell.height,
                            orientation: 'vertical',
                        });
                    });
                } else {
                    // Pas de cellules adjacentes, segment unique
                    if (typeof window !== 'undefined') {
                        console.log(`  -> No adjacent cells, creating single segment`);
                    }
                    segments.push({
                        id: `separator-v-${sep.path}-0`,
                        type: 'separator' as PanelType,
                        segmentIndex: i,
                        x: sep.x - separatorThickness2D / 2,
                        y: sep.y,
                        width: separatorThickness2D,
                        height: sep.height,
                        orientation: 'vertical',
                    });
                }
            } else {
                // Séparateur horizontal
                const adjacentCells = allCells.filter(cell => 
                    Math.abs((cell.y + cell.height) - sep.y) < 2
                );
                
                if (adjacentCells.length > 1) {
                    // Grouper par X (position horizontale)
                    const uniqueCols = new Map<number, typeof allCells[0]>();
                    adjacentCells.forEach(cell => {
                        const key = Math.round(cell.x);
                        if (!uniqueCols.has(key)) {
                            uniqueCols.set(key, cell);
                        }
                    });
                    
                    Array.from(uniqueCols.values())
                        .sort((a, b) => a.x - b.x)
                        .forEach((cell, j) => {
                            segments.push({
                                id: `separator-h-${sep.path}-${j}`,
                                type: 'separator' as PanelType,
                                segmentIndex: i,
                                x: cell.x,
                                y: sep.y - separatorThickness2D / 2,
                                width: cell.width,
                                height: separatorThickness2D,
                                orientation: 'horizontal',
                            });
                        });
                } else {
                    // Segment unique
                    segments.push({
                        id: `separator-h-${sep.path}-0`,
                        type: 'separator' as PanelType,
                        segmentIndex: i,
                        x: sep.x,
                        y: sep.y - separatorThickness2D / 2,
                        width: sep.width,
                        height: separatorThickness2D,
                        orientation: 'horizontal',
                    });
                }
            }
        });
        
        // DEBUG: Log pour les séparateurs avec détails
        if (typeof window !== 'undefined') {
            console.log('=== PanelPlanCanvas Debug ===');
            console.log('All cells:', allCells.map(c => ({
                x: Math.round(c.x),
                y: Math.round(c.y),
                w: Math.round(c.width),
                h: Math.round(c.height),
                right: Math.round(c.x + c.width),
                colPath: c.colPath.join('.'),
                rowPath: c.rowPath.join('.')
            })));
            console.log('Separators:', allSeparators.map((sep) => ({
                path: sep.path,
                orientation: sep.orientation,
                x: Math.round(sep.x),
                y: Math.round(sep.y)
            })));
            
            // Log des segments créés pour les séparateurs verticaux
            const verticalSegments = segments.filter(s => s.type === 'separator' && s.orientation === 'vertical');
            console.log('Vertical separator segments:', verticalSegments.map(s => s.id));
        }

        return segments;
    }, [zone, canvasWidth, canvasHeight, collectGridCells, collectSeparators, panelThickness2D, separatorThickness2D]);

    // Séparer les différents types de panneaux
    const backPanels = panelSegments2D.filter(s => s.type === 'back');
    const separatorPanels = panelSegments2D.filter(s => s.type === 'separator');
    const borderPanels = panelSegments2D.filter(s => s.type !== 'back' && s.type !== 'separator');

    return (
        <div className="border border-[#E8E6E3] bg-white p-5" style={{ borderRadius: '4px' }}>
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#1A1917]">Sélection des panneaux</h3>
                <span className="font-mono text-base font-medium text-[#1A1917]">
                    {width} × {height} mm
                </span>
            </div>

            {/* Canvas */}
            <div
                className="mx-auto inline-flex items-center justify-center overflow-visible bg-[#FAFAF9] cursor-default"
                onClick={() => onSelectPanel(null)}
                style={{
                    borderRadius: '4px',
                    padding: `${panelThickness2D + 16}px`,
                    minWidth: canvasWidth + (panelThickness2D + 16) * 2,
                    maxWidth: '100%',
                }}
            >
                <div
                    className="relative"
                    style={{
                        width: canvasWidth,
                        height: canvasHeight,
                    }}
                >
                    {/* Segments du panneau arrière (divisés selon les zones) */}
                    {backPanels.map((segment) => {
                        const isSelected = selectedPanelId === segment.id;
                        const isDeleted = deletedPanelIds.has(segment.id);
                        
                        // Si supprimé et non sélectionné, rendre complètement transparent
                        if (isDeleted && !isSelected) {
                            return (
                                <div
                                    key={segment.id}
                                    className="absolute cursor-pointer"
                                    style={{
                                        left: segment.x,
                                        top: segment.y,
                                        width: segment.width,
                                        height: segment.height,
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectPanel(segment.id);
                                    }}
                                    title={`Panneau arrière (segment ${segment.segmentIndex + 1}) - RETIRÉ`}
                                />
                            );
                        }
                        
                        return (
                            <div
                                key={segment.id}
                                className="absolute cursor-pointer transition-all duration-150"
                                style={{
                                    left: segment.x,
                                    top: segment.y,
                                    width: segment.width,
                                    height: segment.height,
                                    backgroundColor: isDeleted 
                                        ? 'rgba(255, 87, 34, 0.3)' 
                                        : (isSelected ? '#2196F3' : '#E8E4DC'),
                                    border: isDeleted
                                        ? '2px solid #FF5722'
                                        : (isSelected ? '2px solid #1976D2' : '1px dashed #B89B71'),
                                    boxShadow: isSelected 
                                        ? (isDeleted ? '0 0 8px rgba(255, 87, 34, 0.5)' : '0 0 8px rgba(33, 150, 243, 0.5)')
                                        : 'none',
                                    zIndex: isSelected ? 5 : 0,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectPanel(segment.id);
                                }}
                                title={`Panneau arrière (segment ${segment.segmentIndex + 1})${isDeleted ? ' - RETIRÉ' : ''}`}
                            >
                                <div 
                                    className="absolute inset-0 opacity-0 hover:opacity-20 transition-opacity"
                                    style={{ backgroundColor: isDeleted ? '#FF5722' : '#2196F3' }}
                                />
                            </div>
                        );
                    })}

                    {/* Segments de panneaux latéraux */}
                    {borderPanels.map((segment) => {
                        const isSelected = selectedPanelId === segment.id;
                        const isDeleted = deletedPanelIds.has(segment.id);
                        const panelMeta = PANEL_META[segment.type];
                        
                        // Si supprimé et non sélectionné, rendre complètement transparent
                        if (isDeleted && !isSelected) {
                            return (
                                <div
                                    key={segment.id}
                                    className="absolute cursor-pointer"
                                    style={{
                                        left: segment.x,
                                        top: segment.y,
                                        width: segment.width,
                                        height: segment.height,
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectPanel(segment.id);
                                    }}
                                    title={`${panelMeta?.label || segment.type} - RETIRÉ`}
                                />
                            );
                        }
                        
                        return (
                            <div
                                key={segment.id}
                                className="absolute transition-all duration-150 cursor-pointer"
                                style={{
                                    left: segment.x,
                                    top: segment.y,
                                    width: segment.width,
                                    height: segment.height,
                                    backgroundColor: isDeleted 
                                        ? 'rgba(255, 87, 34, 0.3)'
                                        : (isSelected ? '#2196F3' : '#D4B896'),
                                    border: isDeleted
                                        ? '2px solid #FF5722'
                                        : (isSelected ? '2px solid #1976D2' : '1px solid #B89B71'),
                                    boxShadow: isSelected 
                                        ? (isDeleted ? '0 0 8px rgba(255, 87, 34, 0.5)' : '0 0 8px rgba(33, 150, 243, 0.5)')
                                        : 'none',
                                    zIndex: isSelected ? 10 : 1,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectPanel(segment.id);
                                }}
                                title={`${panelMeta?.label || segment.type} (segment ${segment.segmentIndex + 1})${isDeleted ? ' - RETIRÉ' : ''}`}
                            >
                                <div 
                                    className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity"
                                    style={{ backgroundColor: isDeleted ? '#FF5722' : '#2196F3' }}
                                />
                            </div>
                        );
                    })}

                    {/* Séparateurs (verticaux et horizontaux) */}
                    {separatorPanels.map((segment) => {
                        const isSelected = selectedPanelId === segment.id;
                        const isDeleted = deletedPanelIds.has(segment.id);
                        const isVertical = segment.orientation === 'vertical';
                        
                        // Si supprimé et non sélectionné, rendre complètement transparent
                        if (isDeleted && !isSelected) {
                            return (
                                <div
                                    key={segment.id}
                                    className="absolute cursor-pointer"
                                    style={{
                                        left: segment.x,
                                        top: segment.y,
                                        width: segment.width,
                                        height: segment.height,
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectPanel(segment.id);
                                    }}
                                    title={`Séparateur ${isVertical ? 'vertical' : 'horizontal'} - RETIRÉ`}
                                />
                            );
                        }
                        
                        return (
                            <div
                                key={segment.id}
                                className="absolute transition-all duration-150 cursor-pointer"
                                style={{
                                    left: segment.x,
                                    top: segment.y,
                                    width: segment.width,
                                    height: segment.height,
                                    backgroundColor: isDeleted 
                                        ? 'rgba(255, 87, 34, 0.3)'
                                        : (isSelected ? '#2196F3' : '#A67B5B'),
                                    border: isDeleted
                                        ? '2px solid #FF5722'
                                        : (isSelected ? '2px solid #1976D2' : '1px solid #8B6B4F'),
                                    boxShadow: isSelected 
                                        ? (isDeleted ? '0 0 8px rgba(255, 87, 34, 0.5)' : '0 0 8px rgba(33, 150, 243, 0.5)')
                                        : 'none',
                                    zIndex: isSelected ? 15 : 3,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectPanel(segment.id);
                                }}
                                title={`Séparateur ${isVertical ? 'vertical' : 'horizontal'} (${segment.segmentIndex + 1})${isDeleted ? ' - RETIRÉ' : ''}`}
                            >
                                <div 
                                    className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity"
                                    style={{ backgroundColor: isDeleted ? '#FF5722' : '#2196F3' }}
                                />
                            </div>
                        );
                    })}

                    {/* Coins décoratifs */}
                    {[
                        { left: -panelThickness2D, top: -panelThickness2D },
                        { left: canvasWidth, top: -panelThickness2D },
                        { left: -panelThickness2D, top: canvasHeight },
                        { left: canvasWidth, top: canvasHeight },
                    ].map((pos, i) => (
                        <div
                            key={`corner-${i}`}
                            className="absolute"
                            style={{
                                ...pos,
                                width: panelThickness2D,
                                height: panelThickness2D,
                                backgroundColor: '#C4A87C',
                                border: '1px solid #B89B71',
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Instruction */}
            <p className="mt-4 text-center text-base text-[#706F6C]">
                {selectedPanelId 
                    ? "Panneau sélectionné - Cliquez ailleurs pour désélectionner"
                    : "Cliquez sur un panneau pour le sélectionner"}
            </p>

            {/* Légende */}
            <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-[#706F6C]">
                <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#D4B896', border: '1px solid #B89B71' }} />
                    <span>Panneaux latéraux</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#E8E4DC', border: '1px dashed #B89B71' }} />
                    <span>Panneau arrière</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#A67B5B', border: '1px solid #8B6B4F' }} />
                    <span>Séparateurs</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#2196F3', border: '1px solid #1976D2' }} />
                    <span>Sélectionné</span>
                </div>
            </div>
        </div>
    );
}
