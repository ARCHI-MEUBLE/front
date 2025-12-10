import { useCallback, useMemo } from 'react';
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
}

export default function ZoneEditor({
  rootZone,
  selectedZoneId,
  onRootZoneChange,
  onSelectedZoneIdChange,
  width,
  height,
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
          return {
            ...z,
            type: direction,
            content: undefined,
            splitRatio: 50,
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

  // Calculer la hauteur dynamique du canvas
  const getZoneStats = (zone: Zone): { depth: number; leaves: number } => {
    if (!zone.children || zone.children.length === 0) {
      return { depth: 1, leaves: 1 };
    }
    const childStats = zone.children.map((child) => getZoneStats(child));
    const depth = 1 + Math.max(...childStats.map((stat) => stat.depth));
    const leaves = childStats.reduce((total, stat) => total + stat.leaves, 0);
    return { depth, leaves };
  };

  const { depth, leaves } = getZoneStats(rootZone);
  const baseHeight = 160;
  const dynamicHeight = Math.min(500, baseHeight + Math.max(0, depth - 1) * 80 + Math.max(0, leaves - 1) * 10);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E8E6E3] pb-4">
        <h3 className="font-serif text-lg text-[#1A1917]">Aménagement intérieur</h3>
        <p className="mt-1 text-xs text-[#706F6C]">
          Divisez le meuble en compartiments et placez tiroirs, étagères ou penderie
        </p>
      </div>

      <ZoneCanvas
        zone={rootZone}
        selectedZoneId={selectedZoneId}
        onSelect={onSelectedZoneIdChange}
        height={dynamicHeight}
      />

      <ZoneControls
        selectedZone={selectedZone}
        parentZone={parentZone}
        onSplitZone={splitZone}
        onSetContent={setZoneContent}
        onResetZone={resetZone}
        onSetSplitRatio={setSplitRatio}
        onSelectParent={parentZone ? () => onSelectedZoneIdChange(parentZone.id) : undefined}
      />
    </div>
  );
}
