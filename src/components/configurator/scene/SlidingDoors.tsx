import { useRef } from 'react';
import type * as THREE from 'three';
import { getSafeColor } from './utils';
import { TexturedMaterial } from './TexturedMaterial';
import { Handle } from './StructuralElements';
import { useSmoothedPositionX } from './useSmoothed';
import { useSlidingDirection } from './useSlidingDirection';
import type { ResolvedHandle } from '@/lib/configurator/handles';
import { SLIDING_DOOR, slidingOpening, slidingPanels, slidingTrackDepthMm, type SlidingPanel } from '@/lib/configurator/slidingDoor';

// Porte coulissante dans la vue 3D : vantaux à l'intérieur de l'ouverture, sur deux voies, et rail noir encastré dans
// le dessus et le dessous. Comme les autres portes, le pointeur est géré par le groupe qui l'enveloppe.

const mm = (value: number) => value / 1000;
const RAIL_COLOR = '#141414';
// Le rail est dans la défonce : seuls 2 mm dépassent du dessus et du dessous
const RAIL_VISIBLE = 0.002;

type Vec3 = [number, number, number];

interface SlidingDoorProps {
    // Centre de l'ouverture, au nu du chant avant du meuble
    position: Vec3;
    // Ouverture entre les côtés, le dessus et le dessous (m)
    width: number;
    height: number;
    hexColor?: string | null;
    imageUrl?: string | null;
    // Cuvette encastrée ; null : vantaux sans poignée
    handle: ResolvedHandle | null;
    isOpen?: boolean;
}

function SlidingPanelMesh({
    panel,
    panelCount,
    openingWidth,
    height,
    hexColor,
    imageUrl,
    handle,
    shift,
}: {
    panel: SlidingPanel;
    panelCount: number;
    openingWidth: number;
    height: number;
    hexColor: string;
    imageUrl?: string | null;
    handle: ResolvedHandle | null;
    shift: number;
}) {
    const ref = useRef<THREE.Group>(null);
    const restX = -openingWidth / 2 + mm(panel.leftMm + panel.widthMm / 2);
    useSmoothedPositionX(ref, restX + shift);

    const width = mm(panel.widthMm);
    const thickness = mm(SLIDING_DOOR.panelThicknessMm);
    // Cuvette près du bord extérieur pour les vantaux du bout (on les tire vers le milieu), au centre pour celui du milieu
    const facade =
        panel.index === 0
            ? { kind: 'door' as const, hingeSide: 'right' as const, width, height }
            : panel.index === panelCount - 1
              ? { kind: 'door' as const, hingeSide: 'left' as const, width, height }
              : { kind: 'drawer' as const, width, height };

    return (
        <group ref={ref} position={[restX, 0, -mm(slidingTrackDepthMm(panel.track))]}>
            <mesh castShadow>
                <boxGeometry args={[width - 0.001, height, thickness]} />
                <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} />
            </mesh>
            {handle?.model && <Handle handle={handle} facade={facade} origin={[0, 0, thickness / 2]} />}
        </group>
    );
}

export function SlidingDoor({ position, width, height, hexColor, imageUrl, handle, isOpen = false }: SlidingDoorProps) {
    const widthMm = width * 1000;
    const panels = slidingPanels(widthMm);
    // Une fois sur deux vers la droite, une fois sur deux vers la gauche
    const direction = useSlidingDirection(isOpen);
    const opening = slidingOpening(widthMm, direction);
    const shiftOf = (index: number) => (isOpen && index === opening.index ? mm(opening.shiftMm) : 0);
    const panelHeight = Math.max(0.01, height - 2 * mm(SLIDING_DOOR.panelClearanceMm));
    const railZ = -mm(SLIDING_DOOR.grooveFromFrontMm + SLIDING_DOOR.grooveWidthMm / 2);
    const safeHexColor = getSafeColor(hexColor);

    return (
        <group position={position}>
            {[1, -1].map((side) => (
                <mesh key={side} position={[0, side * (height / 2 - RAIL_VISIBLE / 2), railZ]} receiveShadow>
                    <boxGeometry args={[width, RAIL_VISIBLE, mm(SLIDING_DOOR.grooveWidthMm)]} />
                    <meshStandardMaterial color={RAIL_COLOR} roughness={0.55} metalness={0.1} />
                </mesh>
            ))}
            {panels.map((panel) => (
                <SlidingPanelMesh
                    key={panel.index}
                    panel={panel}
                    panelCount={panels.length}
                    openingWidth={width}
                    height={panelHeight}
                    hexColor={safeHexColor}
                    imageUrl={imageUrl}
                    handle={handle}
                    shift={shiftOf(panel.index)}
                />
            ))}
        </group>
    );
}
