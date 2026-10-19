import { describe, expect, it } from 'vitest';
import { getDivisionCount, isShelfGrid, setDivisionCount, shelfColumnWidths } from './zoneDivision';
import { getZoneSize, listLeafZones } from './zoneStats';
import type { Zone } from '@/components/configurator/ZoneEditor/types';

function leaf(id: string, extra: Partial<Zone> = {}): Zone {
  return { id, type: 'leaf', content: 'empty', ...extra };
}

describe('getDivisionCount', () => {
  it('returns 1 for a compartment', () => {
    expect(getDivisionCount(leaf('a'), 'vertical')).toBe(1);
    expect(getDivisionCount(leaf('a'), 'horizontal')).toBe(1);
  });

  it('reads the columns of a vertical group and the shelves inside them', () => {
    const grid: Zone = {
      id: 'root',
      type: 'vertical',
      children: [
        { id: 'c0', type: 'horizontal', children: [leaf('a'), leaf('b'), leaf('c')] },
        { id: 'c1', type: 'horizontal', children: [leaf('d'), leaf('e'), leaf('f')] },
      ],
    };
    expect(getDivisionCount(grid, 'vertical')).toBe(2);
    expect(getDivisionCount(grid, 'horizontal')).toBe(3);
  });

  it('returns null when columns hold different numbers of shelves', () => {
    const mixed: Zone = {
      id: 'root',
      type: 'vertical',
      children: [{ id: 'c0', type: 'horizontal', children: [leaf('a'), leaf('b')] }, leaf('c1')],
    };
    expect(getDivisionCount(mixed, 'horizontal')).toBeNull();
  });
});

describe('setDivisionCount', () => {
  it('splits a compartment into equal columns', () => {
    const next = setDivisionCount(leaf('root'), 'root', 'vertical', 3);
    expect(next.type).toBe('vertical');
    expect(listLeafZones(next)).toHaveLength(3);
    expect(getZoneSize(next, 'root-2', 900, 600)!.width).toBeCloseTo(300, 5);
  });

  it('allows more than 5 parts', () => {
    const next = setDivisionCount(leaf('root'), 'root', 'horizontal', 8);
    expect(next.children).toHaveLength(8);
  });

  it('adds and removes parts while keeping the existing contents', () => {
    const start: Zone = {
      id: 'root',
      type: 'vertical',
      splitRatio: 30,
      children: [leaf('root-0', { content: 'drawer' }), leaf('root-1', { content: 'door' })],
    };
    const more = setDivisionCount(start, 'root', 'vertical', 4);
    expect(more.children!.map((z) => z.content)).toEqual(['drawer', 'door', 'empty', 'empty']);
    expect(more.splitRatios).toEqual([25, 25, 25, 25]);
    expect(new Set(more.children!.map((z) => z.id)).size).toBe(4);

    const fewer = setDivisionCount(more, 'root', 'vertical', 2);
    expect(fewer.children!.map((z) => z.id)).toEqual(['root-0', 'root-1']);
    expect(fewer.splitRatio).toBe(50);
  });

  it('goes back to a single compartment at 1 and keeps the group door', () => {
    const group: Zone = { id: 'root', type: 'vertical', doorContent: 'door_double', children: [leaf('a'), leaf('b')] };
    const single = setDivisionCount(group, 'root', 'vertical', 1);
    expect(single.type).toBe('leaf');
    expect(single.children).toBeUndefined();
    expect(single.content).toBe('door_double');
    expect(single.doorContent).toBeUndefined();
  });

  it('sets the number of shelves in every column, like Pickawood casiers', () => {
    const columns = setDivisionCount(leaf('root'), 'root', 'vertical', 3);
    const grid = setDivisionCount(columns, 'root', 'horizontal', 4);
    expect(grid.type).toBe('vertical');
    expect(grid.children!.every((col) => col.type === 'horizontal' && col.children!.length === 4)).toBe(true);
    expect(listLeafZones(grid)).toHaveLength(12);
    expect(getDivisionCount(grid, 'horizontal')).toBe(4);
  });

  it('never reuses an id that already exists after a grouping', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      children: [leaf('root-0'), { id: 'group-x', type: 'vertical', children: [leaf('root-1'), leaf('root-2')] }, leaf('root-3')],
    };
    const next = setDivisionCount(root, 'root', 'vertical', 4);
    const ids = [] as string[];
    const walk = (z: Zone) => { ids.push(z.id); z.children?.forEach(walk); };
    walk(next);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only changes the targeted zone', () => {
    const root: Zone = { id: 'root', type: 'vertical', children: [leaf('a'), leaf('b')] };
    const next = setDivisionCount(root, 'b', 'horizontal', 3);
    expect(next.children![0]).toBe(root.children![0]);
    expect(next.children![1].children).toHaveLength(3);
  });
});

describe('shelf grids', () => {
  // Meuble de 2 390 mm : [3 colonnes dont une à 10 étagères] | [groupe avec sous-groupes imbriqués]
  const nested: Zone = {
    id: 'root',
    type: 'vertical',
    splitRatio: 50,
    children: [
      {
        id: 'g1',
        type: 'vertical',
        children: [
          { id: 'c1', type: 'horizontal', children: Array.from({ length: 10 }, (_, i) => leaf(`c1-${i}`)) },
          { id: 'c2', type: 'vertical', splitRatio: 50, children: [leaf('c2-0'), leaf('c2-1')] },
        ],
        splitRatio: 50,
      },
      {
        id: 'g2',
        type: 'horizontal',
        splitRatio: 50,
        children: [{ id: 'v', type: 'vertical', splitRatio: 50, children: [leaf('v-0'), leaf('v-1')] }, leaf('g2-1')],
      },
    ],
  };

  it('recognises simple grids and rejects nested groups', () => {
    expect(isShelfGrid(leaf('a'))).toBe(true);
    expect(isShelfGrid(nested.children![0])).toBe(true);
    expect(isShelfGrid(nested.children![1])).toBe(false);
    expect(isShelfGrid(nested)).toBe(false);
  });

  it('measures the width of every column that would receive shelves', () => {
    expect(shelfColumnWidths(nested.children![0], 1195)).toEqual([597.5, 298.75, 298.75]);
    expect(shelfColumnWidths(leaf('a'), 800)).toEqual([800]);
  });

  it('counts shelves through nested column groups, and gives up on non-grids', () => {
    expect(getDivisionCount(nested.children![0], 'horizontal')).toBeNull(); // 10 dans une colonne, 1 dans les autres
    expect(getDivisionCount(nested, 'horizontal')).toBeNull();
    const uniform = setDivisionCount(nested.children![0], 'g1', 'horizontal', 3);
    expect(getDivisionCount(uniform, 'horizontal')).toBe(3);
    expect(listLeafZones(uniform)).toHaveLength(9);
  });

  it('counts columns of the zone itself', () => {
    expect(getDivisionCount(nested, 'vertical')).toBe(2);
    expect(getDivisionCount(nested.children![0], 'vertical')).toBe(2);
  });
});
