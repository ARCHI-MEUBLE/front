import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ScreenHtml } from './ScreenHtml';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Zone } from '@/components/configurator/ZoneEditor/types';
import { dividerPercentAt, getDividers, type Divider, type FurnitureLayout } from '@/lib/configurator/zoneBounds';
import { findZoneById, getChildRatios, getZoneSize } from '@/lib/configurator/zoneStats';
import { moveDivider, nudgeDivider } from '@/lib/configurator/zoneResize';

// Nouvelles proportions d'un groupe, pendant ou à la fin d'un glissement
export interface DividerChange {
  zoneId: string;
  ratios: number[];
}

interface DividerHandlesProps {
  // Zone affichée : l'aperçu du glissement en cours compris, la poignée suit ainsi sa planche
  rootZone: Zone;
  layout: FurnitureLayout;
  // Dimensions extérieures du meuble (mm), comme dans le plan 2D
  widthMm: number;
  heightMm: number;
  doorsOpen: boolean;
  selectedZoneIds: string[];
  // Aperçu pendant le glissement (null : annulé)
  onPreview: (change: DividerChange | null) => void;
  // Fin du glissement ou flèche du clavier : une seule étape dans l'historique
  onCommit: (change: DividerChange) => void;
}

const keyOf = (divider: Divider) => `${divider.zoneId}:${divider.index}`;

// Pas des flèches du clavier (mm), Maj enfoncée : grand pas
const KEY_STEP_MM = 10;
const KEY_STEP_LARGE_MM = 50;
// En dessous (%), un mouvement ne relance pas le calcul de la scène
const DRAG_STEP_PERCENT = 0.1;

const front = new THREE.Vector3(0, 0, 1);
const up = new THREE.Vector3(0, 1, 0);
const right = new THREE.Vector3(1, 0, 0);

// Poignées des cloisons et des étagères dans la vue 3D : on les fait glisser comme les barres du plan 2D.
// Une petite barre au milieu de chaque planche, de taille fixe à l'écran : elle ne grossit pas avec le zoom.
// Discrète au repos, nette autour de la zone choisie ; au survol la planche s'éclaire, pendant le glissement
// les cotes des deux compartiments voisins s'affichent.
export function DividerHandles({
  rootZone,
  layout,
  widthMm,
  heightMm,
  doorsOpen,
  selectedZoneIds,
  onPreview,
  onCommit,
}: DividerHandlesProps) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Une planche derrière une porte de groupe fermée ne se voit pas : pas de poignée
  const dividers = useMemo(
    () => getDividers(rootZone, layout).filter((divider) => doorsOpen || !divider.behindDoor),
    [rootZone, layout, doorsOpen]
  );

  const latest = useRef({ rootZone, widthMm, heightMm });
  latest.current = { rootZone, widthMm, heightMm };

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const drag = useRef<{ key: string; pointerId: number; last: DividerChange | null } | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  // Zones choisies et leurs ancêtres : les poignées qui les bordent sont mises en avant
  const focusIds = useMemo(() => {
    const parents = new Map<string, string>();
    const walk = (zone: Zone) => zone.children?.forEach((child) => {
      parents.set(child.id, zone.id);
      walk(child);
    });
    walk(rootZone);
    const ids = new Set<string>();
    for (const id of selectedZoneIds) {
      for (let current: string | undefined = id; current; current = parents.get(current)) ids.add(current);
    }
    return ids;
  }, [rootZone, selectedZoneIds]);

  // Le groupe d'une limite, sa taille dans l'axe du déplacement (mm) et celles des deux voisins
  const describe = useCallback((divider: Divider) => {
    const { rootZone: root, widthMm: width, heightMm: height } = latest.current;
    const group = findZoneById(root, divider.zoneId);
    const size = getZoneSize(root, divider.zoneId, width, height);
    if (!group || !size) return null;
    const total = divider.axis === 'x' ? size.width : size.height;
    const ratios = getChildRatios(group);
    return {
      group,
      total,
      before: Math.round((ratios[divider.index] / 100) * total),
      after: Math.round((ratios[divider.index + 1] / 100) * total),
    };
  }, []);

  // Point visé par le pointeur sur le plan qui contient la planche et fait le mieux face à la caméra :
  // la face avant en vue de face ou de ¾, le dessus ou le côté quand on regarde par là
  const pointerCoord = useCallback(
    (divider: Divider, clientX: number, clientY: number): number | null => {
      const rect = gl.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      raycaster.setFromCamera(
        new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1),
        camera
      );
      const view = camera.getWorldDirection(new THREE.Vector3());
      const side = divider.axis === 'x' ? up : right;
      const normal = Math.abs(view.dot(front)) >= Math.abs(view.dot(side)) ? front : side;
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(...divider.center));
      const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (!hit) return null;
      return divider.axis === 'x' ? hit.x : hit.y;
    },
    [camera, gl, raycaster]
  );

  // Une mise à jour de la scène par image au plus, avec la dernière position connue
  const schedulePreview = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const last = drag.current?.last;
      if (last) onPreview(last);
    });
  }, [onPreview]);

  const finish = useCallback(
    (commit: boolean) => {
      const current = drag.current;
      if (!current) return;
      drag.current = null;
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
      setActiveKey(null);
      if (commit && current.last) onCommit(current.last);
      else onPreview(null);
    },
    [onCommit, onPreview]
  );

  const handlePointerDown = (divider: Divider) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { key: keyOf(divider), pointerId: event.pointerId, last: null };
    setActiveKey(keyOf(divider));
  };

  const handlePointerMove = (divider: Divider) => (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId || current.key !== keyOf(divider)) return;
    const coord = pointerCoord(divider, event.clientX, event.clientY);
    const info = coord === null ? null : describe(divider);
    if (coord === null || !info) return;
    const ratios = moveDivider(info.group, divider.index, dividerPercentAt(divider, coord), info.total, DRAG_STEP_PERCENT);
    if (!ratios) return;
    current.last = { zoneId: divider.zoneId, ratios };
    schedulePreview();
  };

  // Flèches : cloison à gauche / à droite, étagère vers le haut / le bas
  const handleKeyDown = (divider: Divider) => (event: KeyboardEvent<HTMLDivElement>) => {
    const backward = divider.axis === 'x' ? 'ArrowLeft' : 'ArrowUp';
    const forward = divider.axis === 'x' ? 'ArrowRight' : 'ArrowDown';
    const sign = event.key === backward ? -1 : event.key === forward ? 1 : 0;
    if (!sign) return;
    event.preventDefault();
    const info = describe(divider);
    if (!info) return;
    const ratios = nudgeDivider(info.group, divider.index, sign * (event.shiftKey ? KEY_STEP_LARGE_MM : KEY_STEP_MM), info.total);
    if (ratios) onCommit({ zoneId: divider.zoneId, ratios });
  };

  const litKey = activeKey ?? hoverKey;
  const lit = litKey ? dividers.find((divider) => keyOf(divider) === litKey) : undefined;

  return (
    <>
      {/* La planche tenue ou survolée s'éclaire : on voit tout de suite ce qui va bouger */}
      {lit && (
        <mesh position={[lit.center[0], lit.center[1], 0]} renderOrder={10} raycast={() => null}>
          <boxGeometry
            args={
              lit.axis === 'x'
                ? [lit.thickness + 0.006, lit.length, layout.depth + 0.006]
                : [lit.length, lit.thickness + 0.006, layout.depth + 0.006]
            }
          />
          <meshBasicMaterial color="#3B3E58" transparent opacity={0.45} depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {dividers.map((divider) => {
        const key = keyOf(divider);
        const isActive = activeKey === key;
        // Pendant un glissement, seule la poignée tenue reste : le reste du dessin est dégagé
        const isHidden = activeKey !== null && !isActive;
        const isShelf = divider.axis === 'y';
        const info = describe(divider);
        const group = info?.group;
        const isNear =
          selectedZoneIds.includes(divider.zoneId) ||
          focusIds.has(group?.children?.[divider.index]?.id ?? '') ||
          focusIds.has(group?.children?.[divider.index + 1]?.id ?? '');
        const label = info
          ? isShelf
            ? `↑ ${info.before} mm · ${info.after} mm ↓`
            : `← ${info.before} mm · ${info.after} mm →`
          : '';

        return (
          <ScreenHtml
            key={key}
            position={divider.center}
            center
            // Au-dessus de l'infobulle des zones (10), sous les boutons de la page (20)
            zIndexRange={[19, 11]}
            style={{ pointerEvents: isHidden ? 'none' : 'auto' }}
          >
            <div
              role="slider"
              tabIndex={isHidden ? -1 : 0}
              aria-label={isShelf ? 'Étagère entre deux niveaux' : 'Cloison entre deux colonnes'}
              aria-orientation={isShelf ? 'vertical' : 'horizontal'}
              aria-valuemin={0}
              aria-valuemax={info ? info.before + info.after : 0}
              aria-valuenow={info?.before ?? 0}
              aria-valuetext={
                info
                  ? isShelf
                    ? `${info.before} mm au-dessus, ${info.after} mm en dessous`
                    : `${info.before} mm à gauche, ${info.after} mm à droite`
                  : undefined
              }
              onPointerDown={handlePointerDown(divider)}
              onPointerMove={handlePointerMove(divider)}
              onPointerUp={() => finish(true)}
              onPointerCancel={() => finish(false)}
              onLostPointerCapture={() => finish(true)}
              onPointerEnter={() => setHoverKey(key)}
              onPointerLeave={() => setHoverKey((current) => (current === key ? null : current))}
              onFocus={() => setHoverKey(key)}
              onBlur={() => setHoverKey((current) => (current === key ? null : current))}
              onKeyDown={handleKeyDown(divider)}
              className={`group relative flex size-7 items-center justify-center outline-none transition-opacity pointer-coarse:size-10 ${
                isShelf ? 'cursor-row-resize' : 'cursor-col-resize'
              } ${isHidden ? 'opacity-0' : 'opacity-100'}`}
              style={{ touchAction: 'none' }}
            >
              <span
                aria-hidden="true"
                className={`block rounded-full border border-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-all duration-150 group-hover:scale-125 group-focus-visible:scale-125 group-focus-visible:ring-2 group-focus-visible:ring-am-mist ${
                  isShelf ? 'h-1.5 w-6' : 'h-6 w-1.5'
                } ${isActive ? 'scale-125 bg-am-navy' : isNear ? 'bg-am-navy' : 'bg-am-navy/65'}`}
              />
              {(isActive || hoverKey === key) && (
                <span
                  role="status"
                  className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-sm bg-am-navy/90 px-2 py-1 text-[11px] leading-none text-white shadow-lg"
                >
                  {isActive ? label : isShelf ? "Glisser pour déplacer l'étagère" : 'Glisser pour déplacer la cloison'}
                </span>
              )}
            </div>
          </ScreenHtml>
        );
      })}
    </>
  );
}
