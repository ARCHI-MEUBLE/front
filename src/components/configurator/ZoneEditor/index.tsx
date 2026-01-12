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
              onSetGlassShelfCount={setGlassShelfCount}
              onSetGlassShelfPositions={setGlassShelfPositions}
              zoneHeightMm={selectedZoneHeightMm}
              onSelectParent={parentZone ? () => onSelectedZoneIdsChange([parentZone.id]) : undefined}
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
