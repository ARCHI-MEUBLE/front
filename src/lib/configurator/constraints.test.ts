import { describe, expect, it } from 'vitest';
import {
  DIMENSION_LIMITS,
  MIN_COMPARTMENT_HEIGHT_MM,
  MIN_COMPARTMENT_WIDTH_MM,
  clampDimension,
  facadeAvailability,
  findConstraintIssues,
  hangingRailAvailability,
  maxPartsFor,
  splitAvailability,
} from './constraints';
import type { Zone } from '@/components/configurator/ZoneEditor/types';

function leaf(id: string, extra: Partial<Zone> = {}): Zone {
  return { id, type: 'leaf', content: 'empty', ...extra };
}

describe('dimensions', () => {
  it('caps the height at 2.2 m and the width at one panel length', () => {
    expect(DIMENSION_LIMITS.height.max).toBe(2200);
    expect(clampDimension('height', 2200)).toBe(2200);
    expect(clampDimension('height', 2400)).toBe(2200);
    expect(clampDimension('width', 6000)).toBe(2800);
    expect(clampDimension('depth', 50)).toBe(200);
  });
});

describe('splitting', () => {
  it('counts the 19 mm separators when computing how many parts fit', () => {
    // 4 casiers in 500 mm leave (500 - 3 × 19) / 4 = 110 mm each, 5 would leave 84 mm
    expect(maxPartsFor(500, MIN_COMPARTMENT_HEIGHT_MM)).toBe(4);
    expect(maxPartsFor(150, MIN_COMPARTMENT_HEIGHT_MM)).toBe(1);
  });

  it('is limited by the compartment size, not by a fixed count', () => {
    // Comme Pickawood : 1 220 mm de large → 5 colonnes de 20 cm au moins, pas 6
    expect(splitAvailability('vertical', 1220, 1580).maxParts).toBe(5);
    // 1 580 mm de haut → 13 casiers de 10 cm au moins
    expect(splitAvailability('horizontal', 400, 1580).maxParts).toBe(13);
    expect(MIN_COMPARTMENT_WIDTH_MM).toBe(200);
  });

  it('refuses shelves spanning more than 1 m', () => {
    const result = splitAvailability('horizontal', 2100, 1900);
    expect(result.maxParts).toBe(1);
    expect(result.reason).toMatch(/colonnes/);
    expect(splitAvailability('vertical', 2100, 1900).maxParts).toBe(9);
  });
});

describe('façades', () => {
  it('limits swinging door leaves to 60 cm', () => {
    expect(facadeAvailability('door', 600, 500).allowed).toBe(true);
    expect(facadeAvailability('door', 700, 500).allowed).toBe(false);
    expect(facadeAvailability('door_double', 1200, 500).allowed).toBe(true);
    expect(facadeAvailability('door_double', 1300, 500).allowed).toBe(false);
    expect(facadeAvailability('push_door_right', 100, 500).allowed).toBe(false);
  });

  it('limits drawers to their slides', () => {
    expect(facadeAvailability('drawer', 2100, 500).allowed).toBe(false);
    expect(facadeAvailability('push_drawer', 600, 500).allowed).toBe(true);
    expect(facadeAvailability('drawer', 600, 200).reason).toMatch(/Profondeur/);
  });

  it('allows empty compartments of any size', () => {
    expect(facadeAvailability('empty', 2800, 200).allowed).toBe(true);
  });
});

describe('hanging rail', () => {
  it('needs enough height and depth', () => {
    expect(hangingRailAvailability(800, 1000, 550).allowed).toBe(true);
    expect(hangingRailAvailability(800, 600, 550).allowed).toBe(false);
    expect(hangingRailAvailability(800, 1000, 400).allowed).toBe(false);
  });
});

describe('findConstraintIssues', () => {
  it('accepts the catalogue models', () => {
    // Meuble TV Moderne : M1(2000,400,600) V2(T,T)
    const moderne: Zone = {
      id: 'root',
      type: 'vertical',
      children: [leaf('root-0', { content: 'drawer' }), leaf('root-1', { content: 'drawer' })],
    };
    expect(findConstraintIssues(moderne, { width: 2000, height: 600, depth: 400 })).toEqual([]);

    // Meuble TV Compact : M1(1200,350,650) V4(,,T,)
    const compact: Zone = {
      id: 'root',
      type: 'vertical',
      children: [leaf('a'), leaf('b'), leaf('c', { content: 'drawer' }), leaf('d')],
    };
    expect(findConstraintIssues(compact, { width: 1200, height: 650, depth: 350 })).toEqual([]);
  });

  it('reports the problems of an oversized configuration', () => {
    const tiny: Zone = { id: 'tiny', type: 'horizontal', children: Array.from({ length: 10 }, (_, i) => leaf(`t${i}`)) };
    const root: Zone = {
      id: 'root',
      type: 'horizontal',
      splitRatios: [45, 45, 10],
      children: [leaf('wide-drawer', { content: 'drawer' }), leaf('wide-door', { content: 'door' }), tiny],
    };
    const issues = findConstraintIssues(root, { width: 2100, height: 2500, depth: 390 });
    const kinds = issues.map((issue) => issue.kind);

    expect(kinds).toContain('dimensions');
    expect(issues.find((i) => i.zoneId === 'wide-drawer')?.kind).toBe('facade');
    expect(issues.find((i) => i.zoneId === 'wide-door')?.kind).toBe('facade');
    expect(issues.some((i) => i.zoneId === 'root' && /Étagères/.test(i.message))).toBe(true);
    // Les compartiments trop petits renvoient vers la division à annuler
    expect(issues.filter((i) => /Compartiment de/.test(i.message)).every((i) => i.zoneId === 'tiny')).toBe(true);
  });

  it('does not treat stacked drawers as shelves', () => {
    const root: Zone = {
      id: 'root',
      type: 'horizontal',
      children: [leaf('a', { content: 'drawer' }), leaf('b', { content: 'drawer' })],
    };
    expect(findConstraintIssues(root, { width: 1100, height: 600, depth: 500 })).toEqual([]);
  });

  it('reports a hanging rail in a compartment that is too shallow', () => {
    const root = leaf('root', { hasDressing: true });
    const issues = findConstraintIssues(root, { width: 900, height: 1800, depth: 350 });
    expect(issues).toEqual([{ kind: 'accessory', zoneId: 'root', message: expect.stringMatching(/Penderie/) }]);
  });
});
