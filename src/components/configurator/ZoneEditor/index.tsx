import { useCallback, useMemo, useEffect } from 'react';
import ZoneCanvas from './ZoneCanvas';
import ZoneControls from './ZoneControls';
import { Zone, ZoneContent, HandleType } from './types';

export { type Zone, type ZoneContent, type ZoneColor } from './types';

interface ZoneEditorProps {
  rootZone: Zone;
  selectedZoneIds: string[];
  onRootZoneChange: (zone: Zone) => void;
  onSelectedZoneIdsChange: (ids: string[]) => void;
  width: number;
  height: number;
  hideControls?: boolean;
  showNumbers?: boolean;
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
          // Si on restaure un espace ouvert, supprimer le flag isOpenSpace
          return { ...z, content, isOpenSpace: undefined };
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
      const isHorizontalSplit = parent.type === 'horizontal'; // niveaux superposés
      
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
        onSelect={onSelectZone}
        onRatioChange={handleRatioChange}
        width={width}
        height={height}
        showNumbers={showNumbers}
      />

      {/* Contrôles dans une card - masqués en mode hideControls */}
      {!hideControls && (
        <div className="border border-[#E8E6E3] bg-[#FAFAF9] p-3" style={{ borderRadius: '2px' }}>
          {selectedZoneIds.length > 0 ? (
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
              onSelectParent={parentZone ? () => onSelectedZoneIdsChange([parentZone.id]) : undefined}
              onDeleteColumn={deleteColumn}
              getColumnPositionInfo={getColumnPositionInfo}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center bg-white shadow-sm" style={{ borderRadius: '2px' }}>
                <span className="text-2xl">☝️</span>
              </div>
              <p className="text-base font-medium text-[#1A1917]">Aucune zone sélectionnée</p>
              <p className="text-sm text-[#706F6C]">Cliquez sur une partie du meuble pour la personnaliser</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
