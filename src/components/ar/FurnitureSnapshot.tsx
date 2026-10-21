import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Furniture } from '@/components/configurator/ThreeCanvas';
import type { ThreeViewerProps } from '@/components/configurator/ThreeViewer';

interface FurnitureSnapshotProps {
  // Le meuble tel que le montre le configurateur
  furniture: ThreeViewerProps;
  // Appelé une fois, quand le meuble est construit et ses textures chargées
  onReady: (furniture: THREE.Object3D) => void;
}

const NO_ZONES: string[] = [];
const NO_PANELS = new Set<string>();

const MIN_WAIT_MS = 400;
// Délai sans nouvelle texture au-delà duquel on considère le chargement terminé
const SETTLE_MS = 500;
const MAX_WAIT_MS = 8000;

// Les textures des couleurs arrivent après le premier rendu : on attend que le nombre de matériaux texturés ne bouge plus
function ReadyProbe({ target, onReady }: { target: React.RefObject<THREE.Group | null>; onReady: (furniture: THREE.Object3D) => void }) {
  const state = useRef({ start: 0, lastChange: 0, textured: -1, done: false });

  useFrame(({ clock }) => {
    const group = target.current;
    const probe = state.current;
    if (probe.done || !group) return;
    const now = clock.elapsedTime * 1000;
    if (probe.start === 0) probe.start = now || 1;

    let textured = 0;
    group.traverse((object) => {
      const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (material?.map?.image) textured++;
    });
    if (textured !== probe.textured) {
      probe.textured = textured;
      probe.lastChange = now;
    }

    const settled = now - probe.start >= MIN_WAIT_MS && now - probe.lastChange >= SETTLE_MS;
    if (settled || now - probe.start >= MAX_WAIT_MS) {
      probe.done = true;
      onReady(group);
    }
  });

  return null;
}

// Scène hors écran qui ne sert qu'à l'export pour la réalité augmentée : le même meuble que le configurateur,
// portes et tiroirs fermés comme à la livraison, sans décoration, sélection ni poignée de réglage.
export default function FurnitureSnapshot({ furniture, onReady }: FurnitureSnapshotProps) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: 64, height: 64, pointerEvents: 'none' }}>
      <Canvas dpr={1} gl={{ antialias: false, powerPreference: 'low-power' }}>
        <group ref={groupRef}>
          <Furniture
            {...furniture}
            doorsOpen={false}
            showDecorations={false}
            hideDrawers={false}
            selectedZoneIds={NO_ZONES}
            selectionTint={false}
            onSelectZone={undefined}
            onToggleDoors={undefined}
            onSelectPanel={undefined}
            selectedPanelIds={NO_PANELS}
            onResizeDivider={undefined}
          />
        </group>
        <ReadyProbe target={groupRef} onReady={onReady} />
      </Canvas>
    </div>
  );
}
