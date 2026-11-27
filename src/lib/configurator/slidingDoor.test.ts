import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Zone } from '@/components/configurator/ZoneEditor/types';
import { useSlidingDirection } from '@/components/configurator/scene/useSlidingDirection';
import {
  SLIDING_DOOR,
  SLIDING_DOOR_MIN_WIDTH_MM,
  nextSlidingDirection,
  slidingOpening,
  slidingOpenShiftMm,
  slidingPanelCount,
  slidingPanels,
  slidingTrackDepthMm,
} from './slidingDoor';
import { facadeAvailability, findConstraintIssues } from './constraints';
import { fixConstraintIssues } from './constraintFix';
import { handleModelsFor, resolveZoneHandle, type HandleModel } from './handles';
import { matchGroupDoor, zoneFacadeCodes, leafHandleFromPrompt } from './promptHandles';
import { computeZoneStats } from './zoneStats';

const BAR: HandleModel = { id: 1, name: 'Barre ronde noire', shape: 'bar', finish_hex: '#1C1C1C', length_mm: 160, image_url: null, position: 1 };
const CUP: HandleModel = { id: 2, name: 'Cuvette LIVING noire', shape: 'cup', finish_hex: '#1C1C1C', length_mm: 92, image_url: null, position: 2 };
const CUP_STEEL: HandleModel = { id: 3, name: 'Cuvette LIVING inox', shape: 'cup', finish_hex: '#C9CCCF', length_mm: 92, image_url: null, position: 3 };
const MODELS = [BAR, CUP, CUP_STEEL];
const DEFAULTS = { modelId: BAR.id, doorOrientation: 'vertical' as const, drawerOrientation: 'horizontal' as const };

const slidingLeaf = (extra: Partial<Zone> = {}): Zone => ({ id: 'root-0', type: 'leaf', content: 'sliding_door', ...extra });

describe('slidingPanels', () => {
  it('uses two panels up to 1.6 m, three above, all the same width', () => {
    expect(slidingPanelCount(1200)).toBe(2);
    expect(slidingPanelCount(1600)).toBe(2);
    expect(slidingPanelCount(1601)).toBe(3);
    expect(new Set(slidingPanels(2400).map((panel) => panel.widthMm)).size).toBe(1);
  });

  it('covers the whole opening, neighbours overlapping so nothing shows between them', () => {
    for (const width of [570, 1000, 1600, 1800, 2762]) {
      const panels = slidingPanels(width);
      const last = panels[panels.length - 1];
      expect(panels[0].leftMm).toBe(0);
      expect(last.leftMm + last.widthMm).toBeCloseTo(width, 6);
      panels.slice(1).forEach((panel, i) => {
        expect(panels[i].leftMm + panels[i].widthMm - panel.leftMm).toBeCloseTo(SLIDING_DOOR.overlapMm, 6);
      });
    }
  });

  it('alternates the tracks so neighbours slide past each other', () => {
    expect(slidingPanels(1000).map((panel) => panel.track)).toEqual(['front', 'back']);
    expect(slidingPanels(2000).map((panel) => panel.track)).toEqual(['front', 'back', 'front']);
    expect(slidingTrackDepthMm('front')).toBe(10 + 9.5);
    expect(slidingTrackDepthMm('back')).toBe(10 + 19 + 4 + 9.5);
    // Les deux voies tiennent dans la profondeur réservée, avec le recul avant et arrière
    expect(slidingTrackDepthMm('back') + SLIDING_DOOR.panelThicknessMm / 2 + SLIDING_DOOR.frontSetbackMm).toBe(SLIDING_DOOR.depthMm);
  });

  it('opens the first panel up to the edge, or up to the next panel of its own track', () => {
    // Deux vantaux de 515 mm : le premier glisse de 485 mm, jusqu'au bord droit
    expect(slidingOpenShiftMm(1000)).toBeCloseTo(485, 6);
    // Trois vantaux : il s'arrête contre le troisième, sur la même voie
    const [first, , third] = slidingPanels(2000);
    expect(first.leftMm + first.widthMm + slidingOpenShiftMm(2000)).toBeCloseTo(third.leftMm, 6);
  });

  it('opens towards the left with the last panel, mirroring the opening towards the right', () => {
    expect(slidingOpening(1000, 'right')).toEqual({ index: 0, shiftMm: expect.closeTo(485, 6) });
    expect(slidingOpening(1000, 'left')).toEqual({ index: 1, shiftMm: expect.closeTo(-485, 6) });

    // Trois vantaux : le dernier s'arrête contre le premier, sur la même voie, sans jamais sortir de l'ouverture
    const [first, , third] = slidingPanels(2000);
    const left = slidingOpening(2000, 'left');
    expect(left.index).toBe(2);
    expect(third.leftMm + left.shiftMm).toBeCloseTo(first.leftMm + first.widthMm, 6);
    expect(left.shiftMm).toBeCloseTo(-slidingOpening(2000, 'right').shiftMm, 6);
  });
});

describe('ouverture une fois à droite, une fois à gauche', () => {
  it('changes direction each time the door closes', () => {
    expect(nextSlidingDirection('right', false, true)).toBe('right');
    expect(nextSlidingDirection('right', true, false)).toBe('left');
    expect(nextSlidingDirection('left', true, false)).toBe('right');
    expect(nextSlidingDirection('left', false, false)).toBe('left');
  });

  it('alternates over several openings in the 3D view', () => {
    const { result, rerender } = renderHook(({ open }) => useSlidingDirection(open), { initialProps: { open: false } });
    const directions: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      rerender({ open: true });
      directions.push(result.current);
      rerender({ open: false });
    }
    expect(directions).toEqual(['right', 'left', 'right', 'left']);
  });
});

describe('limites de la porte coulissante', () => {
  it('needs room for two panels and enough depth, with no maximum width', () => {
    expect(SLIDING_DOOR_MIN_WIDTH_MM).toBe(570);
    expect(facadeAvailability('sliding_door', 2400, 600)).toEqual({ allowed: true });
    expect(facadeAvailability('sliding_door', 500, 600)).toEqual({ allowed: false, reason: 'Min 57 cm' });
    expect(facadeAvailability('sliding_door', 1000, 250)).toEqual({ allowed: false, reason: 'Profondeur min 30 cm' });
  });

  it('is never split into columns by the fix, and becomes a single door when too narrow', () => {
    const wide: Zone = { id: 'root', type: 'leaf', content: 'sliding_door' };
    expect(findConstraintIssues(wide, { width: 2400, height: 2000, depth: 600 })).toEqual([]);

    const narrow: Zone = { id: 'root', type: 'leaf', content: 'sliding_door' };
    const fixed = fixConstraintIssues(narrow, { width: 538, height: 2000, depth: 600 });
    expect(fixed.root.content).toBe('door');
    expect(fixed.changes).toContain('Porte coulissante de 54 cm remplacée par une porte simple.');
  });
});

describe('poignée des portes coulissantes', () => {
  it('only offers recessed handles', () => {
    expect(handleModelsFor(slidingLeaf(), MODELS)).toEqual([CUP, CUP_STEEL]);
    expect(handleModelsFor({ id: 'x', type: 'leaf', content: 'door' }, MODELS)).toEqual(MODELS);
  });

  it('keeps a cup when the furniture has a bar, and its own recessed choice when it has one', () => {
    expect(resolveZoneHandle(slidingLeaf(), 'door', MODELS, DEFAULTS).model).toBe(CUP);
    expect(resolveZoneHandle(slidingLeaf({ handleModelId: CUP_STEEL.id }), 'door', MODELS, DEFAULTS).model).toBe(CUP_STEEL);
    // Un ancien choix de barre sur cette zone est ignoré
    expect(resolveZoneHandle(slidingLeaf({ handleModelId: BAR.id }), 'door', MODELS, DEFAULTS)).toMatchObject({ model: CUP, customized: false });
    // Aucune cuvette dans l'admin : pas de poignée plutôt qu'une barre
    expect(resolveZoneHandle(slidingLeaf(), 'door', [BAR], DEFAULTS).model).toBeNull();
  });
});

describe('texte de génération', () => {
  it('writes and reads back « Pc » on a compartment and on a group', () => {
    expect(zoneFacadeCodes(slidingLeaf(), MODELS, DEFAULTS).door).toBe('Pc');
    expect(zoneFacadeCodes(slidingLeaf({ handleOrientation: 'horizontal' }), MODELS, DEFAULTS).door).toBe('Pc2');
    expect(matchGroupDoor('Pc(H2(,))')).toMatchObject({ doorContent: 'sliding_door', inner: 'H2(,)' });
    expect(matchGroupDoor('Pc1(V2(,))')).toMatchObject({ doorContent: 'sliding_door', handle: { handleOrientation: 'vertical' } });
    expect(leafHandleFromPrompt('Pc2')).toEqual({ handleOrientation: 'horizontal' });
  });

  it('counts a sliding door as one door', () => {
    const root: Zone = { id: 'root', type: 'horizontal', doorContent: 'sliding_door', children: [{ id: 'a', type: 'leaf' }, { id: 'b', type: 'leaf' }] };
    expect(computeZoneStats(root).doors).toBe(1);
  });
});
