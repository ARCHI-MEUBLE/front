import { useCallback, useMemo, useEffect } from 'react';
import ZoneCanvas from './ZoneCanvas';
import ZoneControls from './ZoneControls';
import { Zone, ZoneContent } from './types';

export { type Zone, type ZoneContent } from './types';

interface ZoneEditorProps {
  rootZone: Zone;
  selectedZoneId: string;
  onRootZoneChange: (zone: Zone) => void;
  onSelectedZoneIdChange: (id: string) => void;
  width: number;
  height: number;
  // Expose les actions pour une utilisation externe (ActionBar)
  onSplitZone?: (zoneId: string, direction: 'horizontal' | 'vertical', count?: number) => void;
  onSetZoneContent?: (zoneId: string, content: ZoneContent) => void;
  onResetZone?: (zoneId: string) => void;
  exposeActions?: (actions: {
    splitZone: (zoneId: string, direction: 'horizontal' | 'vertical', count?: number) => void;
    setZoneContent: (zoneId: string, content: ZoneContent) => void;
    resetZone: (zoneId: string) => void;
    selectedZoneInfo: { zone: Zone; parent: Zone | null } | null;
  }) => void;
}

export default function ZoneEditor({
  rootZone,
  selectedZoneId,
  onRootZoneChange,
  onSelectedZoneIdChange,
  width,
  height,
  exposeActions,
}: ZoneEditorProps) {
  // Trouver une zone avec son parent
  const findZoneWithParent = useCallback(
    (current: Zone, targetId: string, parent: Zone | null = null): { zone: Zone; parent: Zone | null } | null => {
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
    () => findZoneWithParent(rootZone, selectedZoneId),
    [findZoneWithParent, rootZone, selectedZoneId]
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
      onSelectedZoneIdChange(`${zoneId}-0`);
    },
    [rootZone, onRootZoneChange, onSelectedZoneIdChange]
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
          };
        }
        if (z.children) {
          return { ...z, children: z.children.map(updateZone) };
        }
        return z;
      };

      onRootZoneChange(updateZone(rootZone));
      onSelectedZoneIdChange(zoneId);
    },
    [rootZone, onRootZoneChange, onSelectedZoneIdChange]
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

  return (
    <div className="space-y-3">
      {/* Canvas avec titre intégré */}
      <ZoneCanvas
        zone={rootZone}
        selectedZoneId={selectedZoneId}
        onSelect={onSelectedZoneIdChange}
        onRatioChange={handleRatioChange}
        width={width}
        height={height}
      />

      {/* Contrôles dans une card */}
      <div className="border border-[#E8E6E3] bg-[#FAFAF9] p-3" style={{ borderRadius: '2px' }}>
        <ZoneControls
          selectedZone={selectedZone}
          parentZone={parentZone}
          onSplitZone={splitZone}
          onSetContent={setZoneContent}
          onResetZone={resetZone}
          onSetSplitRatio={setSplitRatio}
          onSetSplitRatios={setSplitRatios}
          onSelectParent={parentZone ? () => onSelectedZoneIdChange(parentZone.id) : undefined}
        />
      </div>
    </div>
  );
}
