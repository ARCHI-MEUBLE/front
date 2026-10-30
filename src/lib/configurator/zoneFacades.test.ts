import { describe, expect, it } from 'vitest';
import { groupSiblingZones, setZoneFacade } from './zoneFacades';
import { computeZoneStats, getZoneSize, listLeafZones } from './zoneStats';
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

describe('setZoneFacade', () => {
  it('sets the content of a compartment', () => {
    const root: Zone = { id: 'root', type: 'vertical', children: [leaf('a'), leaf('b')] };
    const { root: next, removed } = setZoneFacade(root, 'a', 'door_double');
    expect(find(next, 'a')?.content).toBe('door_double');
    expect(removed).toBe(0);
  });

  it('keeps a niche when a group door is laid over it, and does not count it as a facade', () => {
    const root: Zone = { id: 'root', type: 'vertical', children: [leaf('a', { content: 'niche' }), leaf('b', { content: 'drawer' })] };
    const { root: next, removed } = setZoneFacade(root, 'root', 'door');
    expect(find(next, 'a')?.content).toBe('niche');
    expect(find(next, 'b')?.content).toBe('empty');
    expect(removed).toBe(1);
  });

  it('removes the doors and drawers covered by a new group door', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      children: [leaf('a', { content: 'door_double' }), leaf('b', { content: 'drawer' }), leaf('c', { content: 'niche' })],
    };
    const { root: next, removed } = setZoneFacade(root, 'root', 'door');
    expect(next.doorContent).toBe('door');
    expect(find(next, 'a')?.content).toBe('empty');
    expect(find(next, 'b')?.content).toBe('empty');
    expect(find(next, 'c')?.content).toBe('niche');
    expect(removed).toBe(2);
    expect(computeZoneStats(next).doors).toBe(1);
  });

  it('removes the parent group door when a door is placed on a compartment inside it', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      children: [{ id: 'g', type: 'vertical', doorContent: 'door', children: [leaf('a'), leaf('b')] }, leaf('c')],
    };
    const { root: next, removed } = setZoneFacade(root, 'a', 'door_double');
    expect(find(next, 'g')?.doorContent).toBeUndefined();
    expect(find(next, 'a')?.content).toBe('door_double');
    expect(removed).toBe(1);
    expect(computeZoneStats(next).doors).toBe(2);
  });

  it('keeps the parent group door when a compartment behind it gets a niche', () => {
    const root: Zone = { id: 'root', type: 'vertical', doorContent: 'door', children: [leaf('a'), leaf('b')] };
    const { root: next, removed } = setZoneFacade(root, 'a', 'niche');
    expect(next.doorContent).toBe('door');
    expect(removed).toBe(0);
  });

  it('removes a group door with "empty"', () => {
    const root: Zone = { id: 'root', type: 'vertical', doorContent: 'door_double', children: [leaf('a'), leaf('b')] };
    const { root: next } = setZoneFacade(root, 'root', 'empty');
    expect(next.doorContent).toBeUndefined();
  });

  it('drops a stale doorContent left on a compartment', () => {
    const root = leaf('root', { doorContent: 'door' });
    const { root: next } = setZoneFacade(root, 'root', 'empty');
    expect(next.doorContent).toBeUndefined();
    expect(next.content).toBe('empty');
  });
});

describe('groupSiblingZones', () => {
  const makeId = () => 'grp';

  it('groups adjacent siblings under one door and clears their own façades', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      splitRatios: [20, 30, 50],
      children: [leaf('a'), leaf('b', { content: 'door' }), leaf('c', { content: 'door_double' })],
    };
    const result = groupSiblingZones(root, ['c', 'b'], 'door_double', makeId);
    expect(result.error).toBeUndefined();
    expect(result.groupId).toBe('grp');
    expect(result.removed).toBe(2);

    const group = find(result.root, 'grp')!;
    expect(group.doorContent).toBe('door_double');
    expect(group.children!.map((z) => z.id)).toEqual(['b', 'c']);
    expect(result.root.children!.map((z) => z.id)).toEqual(['a', 'grp']);
    expect(result.root.splitRatio).toBe(20);
    expect(computeZoneStats(result.root).doors).toBe(2);
    // Les tailles réelles sont conservées
    expect(getZoneSize(result.root, 'c', 1000, 500)).toEqual({ width: 500, height: 500 });
  });

  it('keeps the order of siblings when the parent already holds a group before them', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      splitRatios: [25, 25, 25, 25],
      children: [
        { id: 'group-old', type: 'vertical', children: [leaf('x'), leaf('y')] },
        leaf('c'),
        leaf('d'),
        leaf('e'),
      ],
    };
    const result = groupSiblingZones(root, ['c', 'd'], 'door', makeId);
    expect(result.root.children!.map((z) => z.id)).toEqual(['group-old', 'grp', 'e']);
    expect(listLeafZones(result.root).map((z) => z.id)).toEqual(['x', 'y', 'c', 'd', 'e']);
    expect(getZoneSize(result.root, 'e', 1000, 500)).toEqual({ width: 250, height: 500 });
  });

  it('puts the door on the parent when all of its children are selected', () => {
    const root: Zone = { id: 'root', type: 'vertical', children: [leaf('a', { content: 'door' }), leaf('b')] };
    const result = groupSiblingZones(root, ['a', 'b'], 'door_double', makeId);
    expect(result.groupId).toBe('root');
    expect(result.root.doorContent).toBe('door_double');
    expect(result.root.children!.length).toBe(2);
    expect(find(result.root, 'a')?.content).toBe('empty');
  });

  it('refuses compartments that are not side by side', () => {
    const root: Zone = { id: 'root', type: 'vertical', children: [leaf('a'), leaf('b'), leaf('c')] };
    const result = groupSiblingZones(root, ['a', 'c'], 'door', makeId);
    expect(result.error).toBe('not-adjacent');
    expect(result.root).toBe(root);
  });

  it('refuses compartments from different groups', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      children: [{ id: 'g', type: 'horizontal', children: [leaf('a'), leaf('b')] }, leaf('c')],
    };
    expect(groupSiblingZones(root, ['a', 'c'], 'door', makeId).error).toBe('not-siblings');
  });

  it('handles a two-children parent without explicit ratios', () => {
    const root: Zone = { id: 'root', type: 'vertical', children: [leaf('a'), leaf('b'), leaf('c')] };
    const result = groupSiblingZones(root, ['a', 'b'], 'door', makeId);
    expect(result.root.splitRatio).toBeCloseTo(66.667, 2);
    expect(getZoneSize(result.root, 'b', 900, 500)!.width).toBeCloseTo(300, 5);
  });
});
