import { useCallback, useMemo, useEffect } from 'react';
import ZoneCanvas from './ZoneCanvas';
import ZoneControls, { SelectedZoneDimensions } from './ZoneControls';
import { Zone, ZoneContent, HandleType } from './types';

export { default as PanelPlanCanvas } from './PanelPlanCanvas';
export { type Zone, type ZoneContent, type ZoneColor, type PanelId, type PanelType, PANEL_META, panelIdToString, stringToPanelId } from './types';

interface ZoneEditorProps {
  rootZone: Zone;
  selectedZoneIds: string[];
  onRootZoneChange: (zone: Zone) => void;
  onSelectedZoneIdsChange: (ids: string[]) => void;
  width: number;
  height: number;
  hideControls?: boolean;
  showNumbers?: boolean;
  // Contenu à afficher entre le canvas et les contrôles
  renderAfterCanvas?: React.ReactNode;
  // Expose les actions pour une utilisation externe (ActionBar)
  onSplitZone?: (zoneId: string, direction: 'horizontal' | 'vertical', count?: number) => void;
  onSetZoneContent?: (zoneId: string, content: ZoneContent) => void;
  onSetDoorContent?: (zoneId: string, content: ZoneContent) => void;
  onResetZone?: (zoneId: string) => void;
  onToggleLight?: (zoneId: string) => void;
  onToggleCableHole?: (zoneId: string) => void;
  onToggleDressing?: (zoneId: string) => void;
  onGroupZones?: (zoneIds: string[], forceContent?: ZoneContent) => void;
  onSetHandleType?: (zoneId: string, handleType: HandleType) => void;
  isAdminCreateModel?: boolean;
  exposeActions?: (actions: {
    splitZone: (zoneId: string, direction: 'horizontal' | 'vertical', count?: number) => void;
    setZoneContent: (zoneId: string, content: ZoneContent) => void;
    setDoorContent: (zoneId: string, content: ZoneContent) => void;
    resetZone: (zoneId: string) => void;
    toggleLight: (zoneId: string) => void;
    toggleCableHole: (zoneId: string) => void;
    toggleDressing: (zoneId: string) => void;
    groupZones: (zoneIds: string[], forceContent?: ZoneContent) => void;
    selectedZoneInfo: { zone: Zone; parent: Zone | null } | null;
  }) => void;
}

export default function ZoneEditor({
  rootZone,
  selectedZoneIds,
  onRootZoneChange,
  onSelectedZoneIdsChange,
  width,
  height,
  hideControls,
  showNumbers,
  renderAfterCanvas,
  onToggleLight,
  onToggleCableHole,
  onToggleDressing,
  onGroupZones,
  onSetHandleType,
  onSetDoorContent,
  isAdminCreateModel,
  exposeActions,
  onSelectZone,
}: ZoneEditorProps & { onSelectZone?: (id: string | null) => void }) {
  // Trouver une zone avec son parent
  const findZoneWithParent = useCallback(
    (current: Zone, targetId: string | null, parent: Zone | null = null): { zone: Zone; parent: Zone | null } | null => {
      if (!targetId) return null;
      if (current.id === targetId) {
        return { zone: current, parent };
      }

      if (!current.children) {
        return null;
      }

      for (const child of current.children) {
        const result = findZoneWithParent(child, targetId, current);
        if (result) {
          return result;
        }
      }

      return null;
    },
    []
  );

  const selectedZoneInfo = useMemo(
    () => findZoneWithParent(rootZone, selectedZoneIds[0] || null),
    [findZoneWithParent, rootZone, selectedZoneIds]
  );

  const selectedZone = selectedZoneInfo?.zone ?? rootZone;
  const parentZone = selectedZoneInfo?.parent ?? null;

  // Détecter si plusieurs zones sélectionnées partagent le même parent (pour ajuster le groupe)
  const multiSelectInfo = useMemo(() => {
    if (selectedZoneIds.length < 2) return null;

    // Trouver le parent de chaque zone sélectionnée
    const parents: { zone: Zone; parent: Zone | null }[] = [];
    for (const id of selectedZoneIds) {
      const info = findZoneWithParent(rootZone, id);
      if (info) parents.push(info);
    }

    // Vérifier que tous ont le même parent
    if (parents.length !== selectedZoneIds.length) return null;
    const firstParent = parents[0].parent;
    if (!firstParent) return null;

    const allSameParent = parents.every(p => p.parent?.id === firstParent.id);
    if (!allSameParent) return null;

    // Vérifier si toutes les zones sélectionnées sont des enfants directs de ce parent
    const selectedIds = new Set(selectedZoneIds);
    const allAreDirectChildren = firstParent.children?.every(child =>
      selectedIds.has(child.id) || !selectedIds.has(child.id)
    ) ?? false;

    // Vérifier si TOUS les enfants du parent sont sélectionnés
    const allChildrenSelected = firstParent.children?.every(child => selectedIds.has(child.id)) ?? false;

    return {
      commonParent: firstParent,
      allChildrenSelected,
      selectedZones: parents.map(p => p.zone)
    };
  }, [selectedZoneIds, rootZone, findZoneWithParent]);

  // Calculer la hauteur d'une zone en mm (parcours récursif)
  const calculateZoneHeight = useCallback(
    (targetId: string, zone: Zone = rootZone, availableHeight: number = height): number => {
      if (zone.id === targetId) {
        return availableHeight;
      }

      if (!zone.children || zone.children.length === 0) {
        return 0;
      }

      // Pour les divisions horizontales, la hauteur est partagée entre les enfants
      if (zone.type === 'horizontal') {
        const ratios = zone.children.length === 2 && zone.splitRatio !== undefined
          ? [zone.splitRatio, 100 - zone.splitRatio]
          : zone.splitRatios || zone.children.map(() => 100 / zone.children!.length);

        for (let i = 0; i < zone.children.length; i++) {
          const childHeight = availableHeight * (ratios[i] / 100);
          const result = calculateZoneHeight(targetId, zone.children[i], childHeight);
          if (result > 0) return result;
        }
      } else {
        // Pour les divisions verticales, la hauteur reste la même
        for (const child of zone.children) {
          const result = calculateZoneHeight(targetId, child, availableHeight);
          if (result > 0) return result;
        }
      }

      return 0;
    },
    [rootZone, height]
  );

  const selectedZoneHeightMm = useMemo(
    () => Math.round(calculateZoneHeight(selectedZone.id)),
    [calculateZoneHeight, selectedZone.id]
  );

  // Calculer la largeur d'une zone en mm (parcours récursif)
  const calculateZoneWidth = useCallback(
    (targetId: string, zone: Zone = rootZone, availableWidth: number = width): number => {
      if (zone.id === targetId) {
        return availableWidth;
      }

      if (!zone.children || zone.children.length === 0) {
        return 0;
      }

      // Pour les divisions verticales, la largeur est partagée entre les enfants
      if (zone.type === 'vertical') {
        const ratios = zone.children.length === 2 && zone.splitRatio !== undefined
          ? [zone.splitRatio, 100 - zone.splitRatio]
          : zone.splitRatios || zone.children.map(() => 100 / zone.children!.length);

        for (let i = 0; i < zone.children.length; i++) {
          const childWidth = availableWidth * (ratios[i] / 100);
          const result = calculateZoneWidth(targetId, zone.children[i], childWidth);
          if (result > 0) return result;
        }
      } else {
        // Pour les divisions horizontales, la largeur reste la même
        for (const child of zone.children) {
          const result = calculateZoneWidth(targetId, child, availableWidth);
          if (result > 0) return result;
        }
      }

      return 0;
    },
    [rootZone, width]
  );

  const selectedZoneWidthMm = useMemo(
    () => Math.round(calculateZoneWidth(selectedZone.id)),
    [calculateZoneWidth, selectedZone.id]
  );

  // Diviser une zone
  const splitZone = useCallback(
    (zoneId: string, direction: 'horizontal' | 'vertical', count: number = 2) => {
      const updateZone = (z: Zone): Zone => {
        if (z.id === zoneId) {
          // Pour 2 enfants: utiliser splitRatio
          // Pour 3+ enfants: utiliser splitRatios
          const equalRatio = 100 / count;
          return {
            ...z,
            type: direction,
            content: undefined,
            splitRatio: count === 2 ? 50 : undefined,
            splitRatios: count > 2 ? Array(count).fill(equalRatio).map(r => Math.round(r)) : undefined,
            children: Array.from({ length: count }, (_, i) => ({
              id: `${zoneId}-${i}`,
              type: 'leaf' as const,
              content: 'empty' as ZoneContent,
            })),
          };
        }
        if (z.children) {
          return { ...z, children: z.children.map(updateZone) };
        }
        return z;
      };

      onRootZoneChange(updateZone(rootZone));
      onSelectedZoneIdsChange([`${zoneId}-0`]);
    },
    [rootZone, onRootZoneChange, onSelectedZoneIdsChange]
  );

  // Modifier le contenu
  const setZoneContent = useCallback(
    (zoneId: string, content: ZoneContent) => {
      const updateZone = (z: Zone): Zone => {
        if (z.id === zoneId && z.type === 'leaf') {
          return { ...z, content };
        }
        if (z.children) {
          return { ...z, children: z.children.map(updateZone) };
        }
        return z;
      };

      onRootZoneChange(updateZone(rootZone));
    },
    [rootZone, onRootZoneChange]
  );

  // Modifier les portes
  const setDoorContent = useCallback(
    (zoneId: string, content: ZoneContent) => {
      if (onSetDoorContent) {
        onSetDoorContent(zoneId, content);
      } else {
        const updateZone = (z: Zone): Zone => {
          if (z.id === zoneId) {
            return { ...z, doorContent: content === 'empty' ? undefined : content };
          }
          if (z.children) {
            return { ...z, children: z.children.map(updateZone) };
          }
          return z;
        };
        onRootZoneChange(updateZone(rootZone));
      }
    },
    [rootZone, onRootZoneChange, onSetDoorContent]
  );

  // Basculer l'éclairage
  const toggleLight = useCallback(
    (zoneId: string) => {
      if (onToggleLight) {
        onToggleLight(zoneId);
      } else {
        const updateZone = (z: Zone): Zone => {
          if (z.id === zoneId && z.type === 'leaf') {
            return { ...z, hasLight: !z.hasLight };
          }
          if (z.children) {
            return { ...z, children: z.children.map(updateZone) };
          }
          return z;
        };
        onRootZoneChange(updateZone(rootZone));
      }
    },
    [rootZone, onRootZoneChange, onToggleLight]
  );

  // Basculer le passe-câble
  const toggleCableHole = useCallback(
    (zoneId: string) => {
      if (onToggleCableHole) {
        onToggleCableHole(zoneId);
      } else {
        const updateZone = (z: Zone): Zone => {
          if (z.id === zoneId && z.type === 'leaf') {
            return { ...z, hasCableHole: !z.hasCableHole };
          }
          if (z.children) {
            return { ...z, children: z.children.map(updateZone) };
          }
          return z;
        };
        onRootZoneChange(updateZone(rootZone));
      }
    },
    [rootZone, onRootZoneChange, onToggleCableHole]
  );

  // Basculer la penderie
  const toggleDressing = useCallback(
    (zoneId: string) => {
      if (onToggleDressing) {
        onToggleDressing(zoneId);
      } else {
        const updateZone = (z: Zone): Zone => {
          if (z.id === zoneId && z.type === 'leaf') {
            return { ...z, hasDressing: !z.hasDressing };
          }
          if (z.children) {
            return { ...z, children: z.children.map(updateZone) };
          }
          return z;
        };
        onRootZoneChange(updateZone(rootZone));
      }
    },
    [rootZone, onRootZoneChange, onToggleDressing]
  );

  // Définir le type de poignée
  const setHandleType = useCallback(
    (zoneId: string, handleType: HandleType) => {
      if (onSetHandleType) {
        onSetHandleType(zoneId, handleType);
      } else {
        const updateZone = (z: Zone): Zone => {
          if (z.id === zoneId) {
            return { ...z, handleType };
          }
          if (z.children) {
            return { ...z, children: z.children.map(updateZone) };
          }
          return z;
        };
        onRootZoneChange(updateZone(rootZone));
      }
    },
    [rootZone, onRootZoneChange, onSetHandleType]
  );

  // Définir le nombre d'étagères en verre
  const setGlassShelfCount = useCallback(
    (zoneId: string, count: number) => {
      const updateZone = (z: Zone): Zone => {
        if (z.id === zoneId && z.type === 'leaf') {
          // Réinitialiser les positions quand le nombre change
          const defaultPositions = Array.from({ length: count }, (_, i) =>
            Math.round(((i + 1) / (count + 1)) * 100)
          );
          return { ...z, glassShelfCount: count, glassShelfPositions: defaultPositions };
        }
        if (z.children) {
          return { ...z, children: z.children.map(updateZone) };
        }
        return z;
      };
      onRootZoneChange(updateZone(rootZone));
    },
    [rootZone, onRootZoneChange]
  );

  // Définir les positions des étagères en verre
  const setGlassShelfPositions = useCallback(
    (zoneId: string, positions: number[]) => {
      const updateZone = (z: Zone): Zone => {
        if (z.id === zoneId && z.type === 'leaf') {
          return { ...z, glassShelfPositions: positions };
        }
        if (z.children) {
          return { ...z, children: z.children.map(updateZone) };
        }
        return z;
      };
      onRootZoneChange(updateZone(rootZone));
    },
    [rootZone, onRootZoneChange]
  );

  // Réinitialiser une zone
  const resetZone = useCallback(
    (zoneId: string) => {
      const updateZone = (z: Zone): Zone => {
        if (z.id === zoneId) {
          return {
            ...z,
            type: 'leaf',
            content: 'empty',
            children: undefined,
            splitRatio: undefined,
            splitRatios: undefined,
            hasLight: false,
            hasCableHole: false,
          };
        }
        if (z.children) {
          return { ...z, children: z.children.map(updateZone) };
        }
        return z;
      };

      onRootZoneChange(updateZone(rootZone));
      onSelectedZoneIdsChange([zoneId]);
    },
    [rootZone, onRootZoneChange, onSelectedZoneIdsChange]
  );

  // Supprimer une colonne/rangée
  // Si c'est une colonne aux extrémités : supprime tout (avec les séparateurs)
  // Si c'est une colonne au milieu : garde le bas pour connecter les colonnes adjacentes
  const deleteColumn = useCallback(
    (zoneId: string) => {
      // Trouver le parent et l'index de la zone à supprimer
      const findParentAndIndex = (current: Zone, targetId: string, parent: Zone | null = null): { parent: Zone; index: number } | null => {
        if (current.children) {
          const index = current.children.findIndex(child => child.id === targetId);
          if (index !== -1) {
            return { parent: current, index };
          }
          for (const child of current.children) {
            const result = findParentAndIndex(child, targetId, current);
            if (result) return result;
          }
        }
        return null;
      };

      const parentInfo = findParentAndIndex(rootZone, zoneId);
      
      if (!parentInfo) {
        // La zone est la racine, on ne peut pas la supprimer
        return;
      }

      const { parent, index } = parentInfo;
      const siblings = parent.children || [];
      const isVerticalSplit = parent.type === 'vertical'; // colonnes côte à côte
      
      // Déterminer si c'est une position aux extrémités
      const isFirstChild = index === 0;
      const isLastChild = index === siblings.length - 1;
      const isEdgePosition = isFirstChild || isLastChild;
      const isMiddlePosition = !isEdgePosition;

      const updateZone = (z: Zone): Zone => {
        if (z.id === parent.id) {
          const newChildren = [...siblings];
          
          if (siblings.length <= 2) {
            // S'il ne reste que 2 enfants et on en supprime un, 
            // on remplace le parent par l'enfant restant
            const remainingChild = newChildren.filter((_, i) => i !== index)[0];
            return {
              ...remainingChild,
              id: parent.id, // Garder l'ID du parent
            };
          }

          if (isMiddlePosition && isVerticalSplit) {
            // Colonne au milieu : transformer en espace ouvert
            // Garde la même taille mais marque comme "open space" (pas de fond, pas de haut)
            const targetZone = newChildren[index];
            newChildren[index] = {
              ...targetZone,
              type: 'leaf',
              content: 'empty',
              children: undefined,
              doorContent: undefined,
              hasLight: false,
              hasCableHole: false,
              hasDressing: false,
              isOpenSpace: true, // Marquer comme espace ouvert
            };

            // Garder les ratios tels quels (pas de redistribution)
            return {
              ...z,
              children: newChildren,
            };
          } else {
            // Position aux extrémités ou division horizontale : suppression complète
            newChildren.splice(index, 1);

            // Recalculer les ratios
            const currentRatios = z.splitRatios || siblings.map(() => 100 / siblings.length);
            const removedRatio = currentRatios[index];
            const newRatios = currentRatios
              .filter((_, i) => i !== index)
              .map(ratio => ratio + (removedRatio / (siblings.length - 1)));

            // Normaliser les ratios pour qu'ils totalisent 100
            const total = newRatios.reduce((sum, r) => sum + r, 0);
            const normalizedRatios = newRatios.map(r => (r / total) * 100);

            return {
              ...z,
              children: newChildren,
              splitRatios: normalizedRatios.length > 2 ? normalizedRatios : undefined,
              splitRatio: normalizedRatios.length === 2 ? normalizedRatios[0] : undefined,
            };
          }
        }

        if (z.children) {
          return { ...z, children: z.children.map(updateZone) };
        }
        return z;
      };

      const newRootZone = updateZone(rootZone);
      onRootZoneChange(newRootZone);
      
      // Sélectionner une zone adjacente après suppression
      if (siblings.length > 1) {
        const newIndex = isLastChild ? index - 1 : index;
        const adjacentZoneId = siblings[newIndex === index ? index + 1 : newIndex]?.id;
        if (adjacentZoneId) {
          onSelectedZoneIdsChange([adjacentZoneId]);
        } else {
          onSelectedZoneIdsChange([parent.id]);
        }
      } else {
        onSelectedZoneIdsChange([parent.id]);
      }
    },
    [rootZone, onRootZoneChange, onSelectedZoneIdsChange]
  );

  // Obtenir les infos de position d'une zone enfant (pour le bouton supprimer)
  const getColumnPositionInfo = useCallback(
    (zoneId: string): { isEdge: boolean; isMiddle: boolean; canDelete: boolean; parentType: 'vertical' | 'horizontal' | null } | null => {
      const findParentAndIndex = (current: Zone, targetId: string): { parent: Zone; index: number } | null => {
        if (current.children) {
          const index = current.children.findIndex(child => child.id === targetId);
          if (index !== -1) {
            return { parent: current, index };
          }
          for (const child of current.children) {
            const result = findParentAndIndex(child, targetId);
            if (result) return result;
          }
        }
        return null;
      };

      const parentInfo = findParentAndIndex(rootZone, zoneId);
      if (!parentInfo) return null;

      const { parent, index } = parentInfo;
      const siblings = parent.children || [];
      const isFirst = index === 0;
      const isLast = index === siblings.length - 1;

      return {
        isEdge: isFirst || isLast,
        isMiddle: !isFirst && !isLast,
        canDelete: siblings.length > 1,
        parentType: parent.type === 'vertical' ? 'vertical' : parent.type === 'horizontal' ? 'horizontal' : null,
      };
    },
    [rootZone]
  );

  // Modifier le ratio
  const setSplitRatio = useCallback(
    (zoneId: string, ratio: number) => {
      const updateZone = (z: Zone): Zone => {
        if (z.id === zoneId && (z.type === 'horizontal' || z.type === 'vertical')) {
          return { ...z, splitRatio: ratio };
        }
        if (z.children) {
          return { ...z, children: z.children.map(updateZone) };
        }
        return z;
      };

      onRootZoneChange(updateZone(rootZone));
    },
    [rootZone, onRootZoneChange]
  );

  // Modifier les ratios multiples (pour 3+ enfants)
  const setSplitRatios = useCallback(
    (zoneId: string, ratios: number[]) => {
      const updateZone = (z: Zone): Zone => {
        if (z.id === zoneId && (z.type === 'horizontal' || z.type === 'vertical')) {
          return { ...z, splitRatios: ratios };
        }
        if (z.children) {
          return { ...z, children: z.children.map(updateZone) };
        }
        return z;
      };

      onRootZoneChange(updateZone(rootZone));
    },
    [rootZone, onRootZoneChange]
  );

  // Gérer le changement de ratio depuis le canvas (drag)
  const handleRatioChange = useCallback(
    (zoneId: string, ratios: number[]) => {
      if (ratios.length === 2) {
        setSplitRatio(zoneId, ratios[0]);
      } else if (ratios.length > 2) {
        setSplitRatios(zoneId, ratios);
      }
    },
    [setSplitRatio, setSplitRatios]
  );

  // Grouper des zones
  const groupZones = useCallback(
    (zoneIds: string[], forceContent?: ZoneContent) => {
      if (onGroupZones) {
        onGroupZones(zoneIds, forceContent);
      }
    },
    [onGroupZones]
  );


  useEffect(() => {
    if (exposeActions) {
      exposeActions({
        splitZone,
        setZoneContent,
        setDoorContent,
        resetZone,
        toggleLight,
        toggleCableHole,
        toggleDressing,
        groupZones,
        selectedZoneInfo,
      });
    }
  }, [exposeActions, splitZone, setZoneContent, setDoorContent, resetZone, toggleLight, toggleCableHole, toggleDressing, groupZones, selectedZoneInfo]);

  return (
    <div className="space-y-3">
      {/* Canvas avec titre intégré */}
      <ZoneCanvas
        zone={rootZone}
        selectedZoneIds={selectedZoneIds}
        onSelect={onSelectZone || (() => {})}
        onRatioChange={handleRatioChange}
        width={width}
        height={height}
        showNumbers={showNumbers}
      />

      {/* Dimensions de la zone sélectionnée - simplifié */}
      {selectedZone && selectedZoneIds.length === 1 && (
        <SelectedZoneDimensions
          widthMm={selectedZoneWidthMm}
          heightMm={selectedZoneHeightMm}
          canAdjustWidth={!!(parentZone && parentZone.type === 'vertical' && parentZone.children && parentZone.children.length >= 2)}
          canAdjustHeight={!!(parentZone && parentZone.type === 'horizontal' && parentZone.children && parentZone.children.length >= 2)}
          onSetWidth={parentZone && parentZone.type === 'vertical' ? (newWidthMm) => {
            const siblings = parentZone.children || [];
            const myIndex = siblings.findIndex(c => c.id === selectedZone.id);
            if (myIndex === -1 || siblings.length < 2) return;

            const parentWidthMm = calculateZoneWidth(parentZone.id);
            const neighborIndex = myIndex < siblings.length - 1 ? myIndex + 1 : myIndex - 1;

            // Calculer les tailles actuelles en mm de tous les enfants
            const currentRatios = siblings.length === 2 && parentZone.splitRatio !== undefined
              ? [parentZone.splitRatio, 100 - parentZone.splitRatio]
              : parentZone.splitRatios || siblings.map(() => 100 / siblings.length);

            const currentSizesMm = currentRatios.map(r => (r / 100) * parentWidthMm);

            // Limiter la nouvelle largeur
            const minSize = 50;
            const maxSize = currentSizesMm[myIndex] + currentSizesMm[neighborIndex] - minSize;
            const clampedNewWidth = Math.max(minSize, Math.min(maxSize, newWidthMm));

            // Calculer le delta et ajuster le voisin
            const delta = clampedNewWidth - currentSizesMm[myIndex];
            currentSizesMm[myIndex] = clampedNewWidth;
            currentSizesMm[neighborIndex] = currentSizesMm[neighborIndex] - delta;

            // Convertir en ratios avec haute précision
            const newRatios = currentSizesMm.map(size => (size / parentWidthMm) * 100);
            setSplitRatios(parentZone.id, newRatios);
          } : undefined}
          onSetHeight={parentZone && parentZone.type === 'horizontal' ? (newHeightMm) => {
            const siblings = parentZone.children || [];
            const myIndex = siblings.findIndex(c => c.id === selectedZone.id);
            if (myIndex === -1 || siblings.length < 2) return;

            const parentHeightMm = calculateZoneHeight(parentZone.id);
            const neighborIndex = myIndex < siblings.length - 1 ? myIndex + 1 : myIndex - 1;

            // Calculer les tailles actuelles en mm de tous les enfants
            const currentRatios = siblings.length === 2 && parentZone.splitRatio !== undefined
              ? [parentZone.splitRatio, 100 - parentZone.splitRatio]
              : parentZone.splitRatios || siblings.map(() => 100 / siblings.length);

            const currentSizesMm = currentRatios.map(r => (r / 100) * parentHeightMm);

            // Limiter la nouvelle hauteur
            const minSize = 50;
            const maxSize = currentSizesMm[myIndex] + currentSizesMm[neighborIndex] - minSize;
            const clampedNewHeight = Math.max(minSize, Math.min(maxSize, newHeightMm));

            // Calculer le delta et ajuster le voisin
            const delta = clampedNewHeight - currentSizesMm[myIndex];
            currentSizesMm[myIndex] = clampedNewHeight;
            currentSizesMm[neighborIndex] = currentSizesMm[neighborIndex] - delta;

            // Convertir en ratios avec haute précision
            const newRatios = currentSizesMm.map(size => (size / parentHeightMm) * 100);
            setSplitRatios(parentZone.id, newRatios);
          } : undefined}
        />
      )}

      {/* Dimensions du groupe quand plusieurs zones avec même parent sont sélectionnées */}
      {multiSelectInfo && multiSelectInfo.allChildrenSelected && (() => {
        const commonParent = multiSelectInfo.commonParent;
        const grandParent = findZoneWithParent(rootZone, commonParent.id)?.parent;

        // Le groupe peut ajuster sa hauteur si le grand-parent est horizontal (étagères)
        const canAdjustGroupHeight = !!(grandParent && grandParent.type === 'horizontal' && grandParent.children && grandParent.children.length >= 2);
        // Le groupe peut ajuster sa largeur si le grand-parent est vertical
        const canAdjustGroupWidth = !!(grandParent && grandParent.type === 'vertical' && grandParent.children && grandParent.children.length >= 2);

        const groupWidthMm = Math.round(calculateZoneWidth(commonParent.id));
        const groupHeightMm = Math.round(calculateZoneHeight(commonParent.id));

        return (
          <SelectedZoneDimensions
            widthMm={groupWidthMm}
            heightMm={groupHeightMm}
            canAdjustWidth={canAdjustGroupWidth}
            canAdjustHeight={canAdjustGroupHeight}
            onSetWidth={canAdjustGroupWidth && grandParent ? (newWidthMm) => {
              const siblings = grandParent.children || [];
              const myIndex = siblings.findIndex(c => c.id === commonParent.id);
              if (myIndex === -1 || siblings.length < 2) return;

              const grandParentWidthMm = calculateZoneWidth(grandParent.id);
              const neighborIndex = myIndex < siblings.length - 1 ? myIndex + 1 : myIndex - 1;

              const currentRatios = siblings.length === 2 && grandParent.splitRatio !== undefined
                ? [grandParent.splitRatio, 100 - grandParent.splitRatio]
                : grandParent.splitRatios || siblings.map(() => 100 / siblings.length);

              const currentSizesMm = currentRatios.map(r => (r / 100) * grandParentWidthMm);

              const minSize = 50;
              const maxSize = currentSizesMm[myIndex] + currentSizesMm[neighborIndex] - minSize;
              const clampedNewWidth = Math.max(minSize, Math.min(maxSize, newWidthMm));

              const delta = clampedNewWidth - currentSizesMm[myIndex];
              currentSizesMm[myIndex] = clampedNewWidth;
              currentSizesMm[neighborIndex] = currentSizesMm[neighborIndex] - delta;

              const newRatios = currentSizesMm.map(size => (size / grandParentWidthMm) * 100);
              setSplitRatios(grandParent.id, newRatios);
            } : undefined}
            onSetHeight={canAdjustGroupHeight && grandParent ? (newHeightMm) => {
              const siblings = grandParent.children || [];
              const myIndex = siblings.findIndex(c => c.id === commonParent.id);
              if (myIndex === -1 || siblings.length < 2) return;

              const grandParentHeightMm = calculateZoneHeight(grandParent.id);
              const neighborIndex = myIndex < siblings.length - 1 ? myIndex + 1 : myIndex - 1;

              const currentRatios = siblings.length === 2 && grandParent.splitRatio !== undefined
                ? [grandParent.splitRatio, 100 - grandParent.splitRatio]
                : grandParent.splitRatios || siblings.map(() => 100 / siblings.length);

              const currentSizesMm = currentRatios.map(r => (r / 100) * grandParentHeightMm);

              const minSize = 50;
              const maxSize = currentSizesMm[myIndex] + currentSizesMm[neighborIndex] - minSize;
              const clampedNewHeight = Math.max(minSize, Math.min(maxSize, newHeightMm));

              const delta = clampedNewHeight - currentSizesMm[myIndex];
              currentSizesMm[myIndex] = clampedNewHeight;
              currentSizesMm[neighborIndex] = currentSizesMm[neighborIndex] - delta;

              const newRatios = currentSizesMm.map(size => (size / grandParentHeightMm) * 100);
              setSplitRatios(grandParent.id, newRatios);
            } : undefined}
          />
        );
      })()}

      {/* Contenu personnalisé après le canvas (ex: dimensions) */}
      {renderAfterCanvas}

      {/* Contrôles dans une card - masqués en mode hideControls ou si aucune zone sélectionnée */}
      {!hideControls && selectedZoneIds.length > 0 && (
        <div className="border border-[#E8E6E3] bg-[#FAFAF9] p-3" style={{ borderRadius: '2px' }}>
          <ZoneControls
            selectedZone={selectedZone}
            selectedZoneIds={selectedZoneIds}
            parentZone={parentZone}
            onSplitZone={splitZone}
            onSetContent={setZoneContent}
            onSetDoorContent={onSetDoorContent || setDoorContent}
            onResetZone={resetZone}
            onSetSplitRatio={setSplitRatio}
            onSetSplitRatios={setSplitRatios}
            onToggleLight={onToggleLight || toggleLight}
            onToggleCableHole={onToggleCableHole || toggleCableHole}
            onToggleDressing={onToggleDressing || toggleDressing}
            onGroupZones={groupZones}
            onSetHandleType={onSetHandleType || setHandleType}
            onSetGlassShelfCount={setGlassShelfCount}
            onSetGlassShelfPositions={setGlassShelfPositions}
            zoneHeightMm={selectedZoneHeightMm}
            zoneWidthMm={selectedZoneWidthMm}
            onSelectParent={parentZone ? () => onSelectedZoneIdsChange([parentZone.id]) : undefined}
          />
        </div>
      )}
    </div>
  );
}
