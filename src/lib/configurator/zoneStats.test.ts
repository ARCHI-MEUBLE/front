import { describe, expect, it } from 'vitest';
import { computeZoneStats, findParentZone, getZoneFacade, getZoneSize, isPushContent, listLeafZones } from './zoneStats';
import type { Zone } from '@/components/configurator/ZoneEditor/types';

function leaf(id: string, extra: Partial<Zone> = {}): Zone {
  return { id, type: 'leaf', content: 'empty', ...extra };
}

describe('computeZoneStats', () => {
  it('counts a single empty zone as one compartment', () => {
    expect(computeZoneStats(leaf('root'))).toEqual({
      compartments: 1,
      doors: 0,
      drawers: 0,
      niches: 0,
      glassShelves: 0,
      lights: 0,
      cableHoles: 0,
      dressings: 0,
    });
  });

  it('counts doors, drawers and accessories across the tree', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      children: [
        leaf('a', { content: 'door_double', hasLight: true }),
        {
          id: 'b',
          type: 'horizontal',
          children: [
            leaf('b-0', { content: 'drawer' }),
            leaf('b-1', { content: 'push_drawer', hasCableHole: true }),
            leaf('b-2', { content: 'glass_shelf', glassShelfCount: 3, hasDressing: true }),
          ],
        },
        leaf('c', { content: 'mirror_door' }),
      ],
    };

    expect(computeZoneStats(root)).toEqual({
      compartments: 5,
      doors: 3,
      drawers: 2,
      niches: 0,
      glassShelves: 3,
      lights: 1,
      cableHoles: 1,
      dressings: 1,
    });
  });

  it('counts a door laid over a group through doorContent', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      doorContent: 'door_double',
      children: [leaf('a'), leaf('b')],
    };
    const stats = computeZoneStats(root);
    expect(stats.doors).toBe(2);
    expect(stats.compartments).toBe(2);
  });

  it('counts niches as compartments, not as doors or drawers', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      children: [leaf('a', { content: 'niche', zoneColor: { colorId: 3, hex: '#223344' } }), leaf('b'), leaf('c', { content: 'niche' })],
    };
    const stats = computeZoneStats(root);
    expect(stats.niches).toBe(2);
    expect(stats.compartments).toBe(3);
    expect(stats.doors + stats.drawers).toBe(0);
  });

  it('ignores open spaces when counting compartments', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      children: [leaf('a'), leaf('b', { isOpenSpace: true }), leaf('c')],
    };
    expect(computeZoneStats(root).compartments).toBe(2);
  });
});

describe('getZoneFacade', () => {
  it('returns the content of a leaf holding a door or drawer', () => {
    expect(getZoneFacade(leaf('a', { content: 'door' }))).toBe('door');
    expect(getZoneFacade(leaf('a', { content: 'drawer' }))).toBe('drawer');
  });

  it('returns undefined for empty zones and glass shelves', () => {
    expect(getZoneFacade(leaf('a'))).toBeUndefined();
    expect(getZoneFacade(leaf('a', { content: 'glass_shelf' }))).toBeUndefined();
  });

  it('returns the doorContent of a group', () => {
    const group: Zone = { id: 'g', type: 'vertical', doorContent: 'door_double', children: [leaf('a'), leaf('b')] };
    expect(getZoneFacade(group)).toBe('door_double');
    expect(getZoneFacade({ ...group, doorContent: undefined })).toBeUndefined();
  });
});

describe('isPushContent', () => {
  it('flags façades without handle', () => {
    expect(isPushContent('push_door')).toBe(true);
    expect(isPushContent('push_drawer')).toBe(true);
    expect(isPushContent('door')).toBe(false);
    expect(isPushContent(undefined)).toBe(false);
  });
});

describe('listLeafZones', () => {
  it('lists leaves in reading order', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      children: [
        leaf('a'),
        { id: 'b', type: 'horizontal', children: [leaf('b-0'), leaf('b-1')] },
        leaf('c'),
      ],
    };
    expect(listLeafZones(root).map((z) => z.id)).toEqual(['a', 'b-0', 'b-1', 'c']);
  });

  it('returns the root itself when it is a leaf', () => {
    expect(listLeafZones(leaf('root')).map((z) => z.id)).toEqual(['root']);
  });
});

describe('getZoneSize', () => {
  const root: Zone = {
    id: 'root',
    type: 'vertical',
    splitRatio: 25,
    children: [
      leaf('a'),
      { id: 'b', type: 'horizontal', splitRatios: [10, 30, 60], children: [leaf('b-0'), leaf('b-1'), leaf('b-2')] },
    ],
  };

  it('returns the full size for the root', () => {
    expect(getZoneSize(root, 'root', 1000, 800)).toEqual({ width: 1000, height: 800 });
  });

  it('splits the width across vertical children', () => {
    expect(getZoneSize(root, 'a', 1000, 800)).toEqual({ width: 250, height: 800 });
    expect(getZoneSize(root, 'b', 1000, 800)).toEqual({ width: 750, height: 800 });
  });

  it('splits the height across horizontal children inside a column', () => {
    expect(getZoneSize(root, 'b-1', 1000, 800)).toEqual({ width: 750, height: 240 });
  });

  it('returns null for an unknown zone', () => {
    expect(getZoneSize(root, 'nope', 1000, 800)).toBeNull();
  });
});

describe('findParentZone', () => {
  const root: Zone = {
    id: 'root',
    type: 'vertical',
    children: [leaf('a'), { id: 'g', type: 'horizontal', children: [leaf('b'), { id: 'h', type: 'vertical', children: [leaf('c')] }] }],
  };

  it('finds the direct parent at every depth', () => {
    expect(findParentZone(root, 'a')?.id).toBe('root');
    expect(findParentZone(root, 'g')?.id).toBe('root');
    expect(findParentZone(root, 'b')?.id).toBe('g');
    expect(findParentZone(root, 'c')?.id).toBe('h');
  });

  it('returns null for the root and for unknown ids', () => {
    expect(findParentZone(root, 'root')).toBeNull();
    expect(findParentZone(root, 'nope')).toBeNull();
  });
});
