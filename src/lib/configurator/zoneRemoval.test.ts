import { describe, expect, it } from 'vitest';
import { findSeparatorSides, removeSection, removeSeparators } from './zoneRemoval';
import { findZoneById, getChildRatios } from './zoneStats';
import type { Zone } from '@/components/configurator/ZoneEditor/types';

function leaf(id: string, extra: Partial<Zone> = {}): Zone {
  return { id, type: 'leaf', content: 'empty', ...extra };
}

// Le cas signalé : 4 colonnes, la 3e découpée en 3 casiers de même hauteur
function furniture(column: Partial<Zone> = {}): Zone {
  return {
    id: 'root',
    type: 'vertical',
    splitRatios: [25, 25, 25, 25],
    children: [
      leaf('root-0', { content: 'drawer' }),
      leaf('root-1', { content: 'drawer' }),
      {
        id: 'root-2',
        type: 'horizontal',
        splitRatios: [100 / 3, 100 / 3, 100 / 3],
        children: [leaf('root-2-0'), leaf('root-2-1'), leaf('root-2-2')],
        ...column,
      },
      leaf('root-3'),
    ],
  };
}

describe('removeSection', () => {
  it('gives the space of a removed shelf to the one above', () => {
    const result = removeSection(furniture(), 'root-2-1');
    const column = findZoneById(result.root!, 'root-2')!;
    expect(column.children!.map((child) => child.id)).toEqual(['root-2-0', 'root-2-2']);
    expect(getChildRatios(column)[0]).toBeCloseTo(200 / 3);
    expect(column.splitRatios).toBeUndefined();
    expect(result.keptId).toBe('root-2-0');
  });

  it('gives the space of the first part to the next one', () => {
    const result = removeSection(furniture(), 'root-2-0');
    const column = findZoneById(result.root!, 'root-2')!;
    expect(column.children!.map((child) => child.id)).toEqual(['root-2-1', 'root-2-2']);
    expect(column.splitRatio).toBeCloseTo(200 / 3);
  });

  it('turns a group left with one part back into a compartment, keeping its door', () => {
    const root: Zone = {
      id: 'root',
      type: 'horizontal',
      doorContent: 'door_double',
      splitRatio: 30,
      children: [leaf('root-0'), leaf('root-1')],
    };
    const result = removeSection(root, 'root-0');
    expect(result.root).toEqual({ id: 'root', type: 'leaf', content: 'door_double' });
    expect(result.keptId).toBe('root');
  });

  it('refuses to remove the whole furniture', () => {
    expect(removeSection(furniture(), 'root').error).toBe('root');
    expect(removeSection(furniture(), 'nope').error).toBe('not-found');
  });
});

describe('findSeparatorSides', () => {
  it('reads the shelf between two parts of a column from its 3D id', () => {
    expect(findSeparatorSides(furniture(), 'separator-h-c2-h0-0')).toEqual({
      groupId: 'root-2',
      beforeId: 'root-2-0',
      afterId: 'root-2-1',
    });
    expect(findSeparatorSides(furniture(), 'separator-v-v1-0')).toEqual({
      groupId: 'root',
      beforeId: 'root-1',
      afterId: 'root-2',
    });
  });

  it('ignores ids that do not match the furniture', () => {
    expect(findSeparatorSides(furniture(), 'separator-v-c2-h0-0')).toBeNull();
    expect(findSeparatorSides(furniture(), 'separator-h-c2-h2-0')).toBeNull();
    expect(findSeparatorSides(furniture(), 'panel-left-0')).toBeNull();
  });
});

describe('removeSeparators', () => {
  it('merges the two shelves around a removed plank', () => {
    const result = removeSeparators(furniture(), ['separator-h-c2-h0-0']);
    const column = findZoneById(result.root, 'root-2')!;
    expect(result.removed).toBe(1);
    expect(column.children!.map((child) => child.id)).toEqual(['root-2-0', 'root-2-2']);
    expect(getChildRatios(column)[0]).toBeCloseTo(200 / 3);
  });

  it('keeps the equipped compartment rather than the empty one', () => {
    const root = furniture({ children: [leaf('root-2-0'), leaf('root-2-1', { content: 'drawer' }), leaf('root-2-2')] });
    const column = findZoneById(removeSeparators(root, ['separator-h-c2-h0-0']).root, 'root-2')!;
    expect(column.children!.map((child) => child.id)).toEqual(['root-2-1', 'root-2-2']);
    expect(column.children![0].content).toBe('drawer');
  });

  it('keeps the divided side when a plank separates a group from a compartment', () => {
    const result = removeSeparators(furniture(), ['separator-v-v1-0']);
    expect(result.root.children!.map((child) => child.id)).toEqual(['root-0', 'root-2', 'root-3']);
    expect(getChildRatios(result.root)).toEqual([25, 50, 25]);
  });

  it('refuses to merge two divided sides', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      children: [
        { id: 'a', type: 'horizontal', children: [leaf('a-0'), leaf('a-1')] },
        { id: 'b', type: 'horizontal', children: [leaf('b-0'), leaf('b-1')] },
      ],
    };
    const result = removeSeparators(root, ['separator-v-v0-0']);
    expect(result).toMatchObject({ removed: 0, blocked: 1 });
    expect(result.root).toBe(root);
  });

  it('removes several planks of the same group, whose paths shift after each merge', () => {
    const result = removeSeparators(furniture(), ['separator-h-c2-h0-0', 'separator-h-c2-h1-0']);
    expect(result.removed).toBe(2);
    expect(findZoneById(result.root, 'root-2')).toEqual(leaf('root-2'));
  });

  it('counts the pieces of one plank once', () => {
    expect(removeSeparators(furniture(), ['separator-h-c2-h0-0', 'separator-h-c2-h0-1']).removed).toBe(1);
  });
});
