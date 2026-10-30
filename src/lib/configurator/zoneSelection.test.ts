import { describe, expect, it } from 'vitest';
import { computeRects, extendSelection, groupSelection, selectableNeighborIds, selectionSizeMm } from './zoneSelection';
import type { Zone } from '@/components/configurator/ZoneEditor/types';

function leaf(id: string, extra: Partial<Zone> = {}): Zone {
  return { id, type: 'leaf', content: 'empty', ...extra };
}

function find(zone: Zone, id: string): Zone | undefined {
  if (zone.id === id) return zone;
  for (const child of zone.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return undefined;
}

// Deux caissons côte à côte ; le premier a deux étagères de deux compartiments, le second est plein
const grid = (): Zone => ({
  id: 'root',
  type: 'vertical',
  splitRatio: 50,
  children: [
    {
      id: 'c1',
      type: 'horizontal',
      children: [
        { id: 'r1', type: 'vertical', children: [leaf('a'), leaf('b')] },
        { id: 'r2', type: 'vertical', children: [leaf('c'), leaf('d')] },
      ],
    },
    leaf('e'),
  ],
});

describe('extendSelection', () => {
  it('adds a compartment next to the selection', () => {
    const result = extendSelection(grid(), ['a'], 'b');
    expect(result?.ids).toEqual(['a', 'b']);
  });

  it('adds a compartment above or below, even in another shelf', () => {
    expect(extendSelection(grid(), ['a'], 'c')?.ids).toEqual(['a', 'c']);
    expect(extendSelection(grid(), ['d'], 'b')?.ids).toEqual(['b', 'd']);
  });

  it('refuses a diagonal neighbour', () => {
    expect(extendSelection(grid(), ['a'], 'd')).toBeNull();
  });

  it('refuses a compartment of another caisson', () => {
    expect(extendSelection(grid(), ['b'], 'e')).toBeNull();
  });

  it('keeps the selection rectangular by absorbing the compartments in between', () => {
    const result = extendSelection(grid(), ['a', 'b'], 'c');
    expect(result?.ids).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('selectableNeighborIds', () => {
  it('lists the neighbours of the selection inside its caisson', () => {
    expect(selectableNeighborIds(grid(), ['a']).sort()).toEqual(['b', 'c']);
  });
});

describe('groupSelection', () => {
  it('puts a door on side-by-side siblings', () => {
    const result = groupSelection(grid(), ['a', 'b'], 'door');
    expect(result.error).toBeUndefined();
    expect(find(result.root, 'r1')?.doorContent).toBe('door');
  });

  it('puts one door on a column of compartments from different shelves, keeping the layout', () => {
    const before = computeRects(grid());
    const result = groupSelection(grid(), ['a', 'c'], 'door');
    expect(result.error).toBeUndefined();

    const door = find(result.root, result.groupId!)!;
    expect(door.doorContent).toBe('door');
    expect(door.children?.map((child) => child.id)).toEqual(['a', 'c']);

    const after = computeRects(result.root);
    for (const id of ['a', 'b', 'c', 'd', 'e']) expect(after.get(id)).toEqual(before.get(id));
    expect(after.get(result.groupId!)).toEqual({ x0: 0, x1: 0.25, y0: 0, y1: 1 });
  });

  it('puts one door on a whole shelf column spanning every row of the node', () => {
    const root: Zone = {
      id: 'root',
      type: 'horizontal',
      children: [
        { id: 'r1', type: 'vertical', children: [leaf('a'), leaf('b'), leaf('c')] },
        { id: 'r2', type: 'vertical', children: [leaf('d'), leaf('e'), leaf('f')] },
      ],
    };
    const result = groupSelection(root, ['b', 'e'], 'door');
    expect(result.error).toBeUndefined();
    const after = computeRects(result.root);
    const rect = after.get(result.groupId!)!;
    expect([rect.x0, rect.x1, rect.y0, rect.y1]).toEqual([expect.closeTo(1 / 3), expect.closeTo(2 / 3), 0, 1]);
    expect(find(result.root, result.groupId!)?.children?.map((child) => child.id)).toEqual(['b', 'e']);
  });

  it('grows an L-shaped selection to the rectangle that contains it', () => {
    const root: Zone = {
      id: 'root',
      type: 'horizontal',
      children: [leaf('top'), { id: 'row', type: 'vertical', children: [leaf('a'), leaf('b')] }],
    };
    expect(extendSelection(root, ['top'], 'a')?.ids).toEqual(['top', 'a', 'b']);
    expect(groupSelection(root, ['top', 'a'], 'door').groupId).toBe('root');
  });
});

describe('selectionSizeMm', () => {
  it('measures the rectangle covered by the selection', () => {
    expect(selectionSizeMm(grid(), ['a', 'c'], 2000, 1000)).toEqual({ width: 500, height: 1000 });
  });
});
