import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { Zone } from '@/components/configurator/ZoneEditor/types';
import { findZoneById } from '@/lib/configurator/zoneStats';
import { getZoneBox, type Box, type FurnitureLayout, type Vec3 } from '@/lib/configurator/zoneBounds';

// Hex et non jeton am-* : Three.js ne lit pas les variables CSS (navy de la palette). Les espaces ouverts
// gardent la même couleur : le bordeaux est réservé aux planches retirées (StructuralElements.tsx)
const SELECTED_COLOR = '#3B3E58';

// Les 12 arêtes d'un pavé centré sur l'origine, en segments de deux points
function boxEdges([sx, sy, sz]: Vec3): Vec3[] {
  const x = sx / 2;
  const y = sy / 2;
  const z = sz / 2;
  const edges: [Vec3, Vec3][] = [];
  for (const py of [-y, y]) {
    edges.push([[-x, py, -z], [x, py, -z]], [[x, py, -z], [x, py, z]], [[x, py, z], [-x, py, z]], [[-x, py, z], [-x, py, -z]]);
  }
  for (const px of [-x, x]) {
    for (const pz of [-z, z]) edges.push([[px, -y, pz], [px, y, pz]]);
  }
  return edges.flat();
}

interface OutlineProps {
  box: Box;
  color: string;
  // Voile coloré sur la zone (0 : aucun)
  tint: number;
  // « neighbor » : compartiment voisin de la sélection, que l'on peut y ajouter d'un clic
  emphasis: 'selected' | 'hover' | 'neighbor';
}

// Contour épais et voile léger d'une zone. Le contour reste visible, plus discret, à travers un tiroir
// sorti ou une porte ouverte : la zone choisie ne « disparaît » jamais derrière une façade.
function ZoneOutline({ box, color, tint, emphasis }: OutlineProps) {
  const sx = box.size[0] + 0.006;
  const sy = box.size[1] + 0.006;
  const sz = box.size[2] + 0.006;
  const edges = useMemo(() => boxEdges([sx, sy, sz]), [sx, sy, sz]);
  const selected = emphasis === 'selected';
  // Pointillés : l'ajout possible se distingue d'un compartiment déjà choisi (trait plein)
  const dash = emphasis === 'neighbor' ? { dashed: true, dashSize: 0.04, gapSize: 0.03 } : {};

  return (
    <group position={box.center}>
      {tint > 0 && (
        <mesh raycast={() => null} renderOrder={20}>
          <boxGeometry args={[sx, sy, sz]} />
          <meshBasicMaterial color={color} transparent opacity={tint} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <Line
        points={edges}
        segments
        color={color}
        lineWidth={selected ? 2.6 : 1.8}
        transparent
        opacity={selected ? 1 : 0.85}
        toneMapped={false}
        renderOrder={21}
        raycast={() => null}
        {...dash}
      />
      <Line
        points={edges}
        segments
        color={color}
        lineWidth={selected ? 2 : 1.4}
        transparent
        opacity={selected ? 0.35 : 0.22}
        depthTest={false}
        toneMapped={false}
        renderOrder={22}
        raycast={() => null}
      />
    </group>
  );
}

interface ZoneHighlightsProps {
  rootZone: Zone | null;
  layout: FurnitureLayout;
  selectedZoneIds: string[];
  neighborZoneIds?: string[];
  hoveredZoneId: string | null;
  // Faux : la zone choisie n'est soulignée que par son contour (choix des couleurs : le voile les fausserait)
  selectionTint: boolean;
}

export function ZoneHighlights({ rootZone, layout, selectedZoneIds, neighborZoneIds = [], hoveredZoneId, selectionTint }: ZoneHighlightsProps) {
  if (!rootZone) return null;

  const outlines: React.ReactNode[] = [];

  const add = (zoneId: string, emphasis: OutlineProps['emphasis']) => {
    const zone = findZoneById(rootZone, zoneId);
    const box = getZoneBox(rootZone, zoneId, layout);
    if (!zone || !box) return;

    const isGroup = zone.type !== 'leaf' && !!zone.children?.length;
    // Un groupe couvre beaucoup de place : son contour suffit, le voile reste très léger
    const baseTint = emphasis === 'selected' ? (selectionTint ? 0.28 : 0) : emphasis === 'neighbor' ? 0.08 : 0.12;
    outlines.push(
      <ZoneOutline
        key={`${emphasis}-${zoneId}`}
        box={box}
        color={SELECTED_COLOR}
        tint={isGroup ? baseTint * 0.4 : baseTint}
        emphasis={emphasis}
      />
    );
  };

  selectedZoneIds.forEach((id) => add(id, 'selected'));
  neighborZoneIds.filter((id) => id !== hoveredZoneId).forEach((id) => add(id, 'neighbor'));
  if (hoveredZoneId && !selectedZoneIds.includes(hoveredZoneId)) add(hoveredZoneId, 'hover');

  return <group>{outlines}</group>;
}
