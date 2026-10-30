import { describe, expect, it } from 'vitest';
import {
  describeZone,
  dividerPercentAt,
  getDividers,
  getFurnitureBox,
  getFurnitureLayout,
  getZoneBox,
  unionBoxes,
  type FurnitureLayout,
} from './zoneBounds';
import type { Zone } from '@/components/configurator/ZoneEditor/types';

function leaf(id: string, extra: Partial<Zone> = {}): Zone {
  return { id, type: 'leaf', content: 'empty', ...extra };
}

// Meuble 1,5 m × 0,73 m × 0,5 m sans socle, panneaux de 19 mm
const layout: FurnitureLayout = { width: 1.5, depth: 0.5, sideHeight: 0.73, yOffset: 0, thickness: 0.019 };

describe('getZoneBox', () => {
  it('shares the interior between three equal columns', () => {
    const root: Zone = { id: 'root', type: 'vertical', children: [leaf('a'), leaf('b'), leaf('c')] };
    const interior = 1.5 - 0.038;
    const share = interior / 3;

    const a = getZoneBox(root, 'a', layout)!;
    const c = getZoneBox(root, 'c', layout)!;
    expect(a.size[0]).toBeCloseTo(share, 6);
    expect(a.center[0]).toBeCloseTo(-share, 6);
    expect(c.center[0]).toBeCloseTo(share, 6);
    expect(a.center[1]).toBeCloseTo(0.365, 6);
    expect(a.size[1]).toBeCloseTo(0.73 - 0.038, 6);
    expect(a.size[2]).toBe(0.5);
  });

  it('stacks shelves from top to bottom', () => {
    const root: Zone = { id: 'root', type: 'horizontal', splitRatio: 25, children: [leaf('top'), leaf('bottom')] };
    const interiorHeight = 0.73 - 0.038;
    const top = getZoneBox(root, 'top', layout)!;
    const bottom = getZoneBox(root, 'bottom', layout)!;

    expect(top.size[1]).toBeCloseTo(interiorHeight * 0.25, 6);
    expect(bottom.size[1]).toBeCloseTo(interiorHeight * 0.75, 6);
    expect(top.center[1]).toBeGreaterThan(bottom.center[1]);
    // Les deux boîtes se touchent
    expect(top.center[1] - top.size[1] / 2).toBeCloseTo(bottom.center[1] + bottom.size[1] / 2, 6);
  });

  it('finds nested zones and groups, honouring the split ratios', () => {
    const group: Zone = { id: 'g', type: 'horizontal', children: [leaf('g-0'), leaf('g-1')] };
    const root: Zone = { id: 'root', type: 'vertical', splitRatios: [25, 75], children: [leaf('a'), group] };
    const interior = 1.5 - 0.038;

    const box = getZoneBox(root, 'g', layout)!;
    expect(box.size[0]).toBeCloseTo(interior * 0.75, 6);
    const inner = getZoneBox(root, 'g-1', layout)!;
    expect(inner.size[0]).toBeCloseTo(interior * 0.75, 6);
    expect(inner.size[1]).toBeCloseTo((0.73 - 0.038) / 2, 6);
    expect(getZoneBox(root, 'missing', layout)).toBeNull();
  });

  it('lifts every zone above the plinth', () => {
    const withSocle: FurnitureLayout = { ...layout, sideHeight: 0.63, yOffset: 0.1 };
    const box = getZoneBox(leaf('root'), 'root', withSocle)!;
    expect(box.center[1]).toBeCloseTo(0.63 / 2 + 0.1, 6);
    expect(getFurnitureBox(withSocle).size[1]).toBeCloseTo(0.73, 6);
    expect(getFurnitureBox(withSocle).center[1]).toBeCloseTo(0.365, 6);
  });
});

describe('unionBoxes', () => {
  it('wraps all the boxes', () => {
    const union = unionBoxes([
      { center: [0, 0, 0], size: [2, 2, 2] },
      { center: [4, 1, 0], size: [2, 2, 2] },
    ])!;
    expect(union.center).toEqual([2, 0.5, 0]);
    expect(union.size).toEqual([6, 3, 2]);
    expect(unionBoxes([])).toBeNull();
  });
});

describe('describeZone', () => {
  const root: Zone = {
    id: 'root',
    type: 'vertical',
    children: [leaf('a'), leaf('b', { content: 'drawer' }), { id: 'g', type: 'horizontal', doorContent: 'door_double', children: [leaf('g-0'), leaf('g-1')] }],
  };

  it('describes a compartment with its content and size', () => {
    expect(describeZone(root, 'b', 1500, 730)).toEqual({
      title: 'Compartiment 2 sur 4',
      detail: 'Tiroir · 500 × 730 mm',
      openable: true,
    });
    expect(describeZone(root, 'a', 1500, 730)).toMatchObject({ detail: 'Vide · 500 × 730 mm', openable: false });
  });

  it('describes a group and the door laid over it', () => {
    expect(describeZone(root, 'g', 1500, 730)).toEqual({
      title: 'Groupe · 2 niveaux',
      detail: 'Double Porte · 500 × 730 mm',
      openable: true,
    });
  });

  it('names a single compartment "Meuble entier" and ignores unknown zones', () => {
    expect(describeZone(leaf('root'), 'root', 1000, 700)?.title).toBe('Meuble entier');
    expect(describeZone(root, 'nope', 1500, 730)).toBeNull();
  });
});

describe('getFurnitureLayout', () => {
  it('converts millimetres to metres', () => {
    expect(getFurnitureLayout(1500, 730, 500, false)).toEqual({ width: 1.5, depth: 0.5, sideHeight: 0.73, yOffset: 0, thickness: 0.019 });
  });

  it('keeps the plinth inside the total height', () => {
    const layout = getFurnitureLayout(2000, 800, 400, true);
    expect(layout.sideHeight + layout.yOffset).toBeCloseTo(0.8, 6);
    expect(layout.yOffset).toBe(0.1);
  });

  it('falls back to the default size when a dimension is missing', () => {
    expect(getFurnitureLayout(0, 0, 0, false)).toMatchObject({ width: 1.5, sideHeight: 0.73, depth: 0.5 });
  });
});

describe('getDividers', () => {
  const t = 0.019;
  const interiorWidth = 1.5 - 2 * t;
  const interiorHeight = 0.73 - 2 * t;

  it('places partitions like the 3D scene, panel thickness deducted', () => {
    const root: Zone = { id: 'root', type: 'vertical', children: [leaf('a'), leaf('b'), leaf('c')] };
    const dividers = getDividers(root, layout);
    expect(dividers).toHaveLength(2);

    const column = (interiorWidth - 2 * t) / 3;
    const [first, second] = dividers;
    expect(first).toMatchObject({ zoneId: 'root', index: 0, axis: 'x', panelId: 'separator-v-v0-0', behindDoor: false });
    expect(first.center[0]).toBeCloseTo(-interiorWidth / 2 + column + t / 2, 6);
    expect(second.center[0]).toBeCloseTo(-interiorWidth / 2 + 2 * column + t + t / 2, 6);
    expect(first.center[1]).toBeCloseTo(0.365, 6);
    expect(first.center[2]).toBe(0.25);
    expect(first.length).toBeCloseTo(interiorHeight, 6);
  });

  it('names nested shelves like the scene and flags those behind a group door', () => {
    const shelves: Zone = { id: 'g', type: 'horizontal', doorContent: 'door', children: [leaf('g0'), leaf('g1')] };
    const root: Zone = { id: 'root', type: 'vertical', splitRatios: [25, 75], children: [leaf('a'), shelves] };
    const shelf = getDividers(root, layout).find((divider) => divider.zoneId === 'g')!;

    expect(shelf).toMatchObject({ index: 0, axis: 'y', panelId: 'separator-h-c1-h0-0', behindDoor: true });
    const columnWidth = (interiorWidth - t) * 0.75;
    expect(shelf.length).toBeCloseTo(columnWidth, 6);
    expect(shelf.center[1]).toBeCloseTo(0.73 - t - (interiorHeight - t) / 2 - t / 2, 6);
  });

  it('turns a position back into the share of the children before the divider', () => {
    const root: Zone = { id: 'root', type: 'horizontal', splitRatios: [30, 30, 40], children: [leaf('a'), leaf('b'), leaf('c')] };
    for (const divider of getDividers(root, layout)) {
      const expected = divider.index === 0 ? 30 : 60;
      expect(dividerPercentAt(divider, divider.center[1])).toBeCloseTo(expected, 6);
    }
  });
});
