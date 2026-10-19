import { describe, expect, it } from 'vitest';
import type { Zone } from '@/components/configurator/ZoneEditor/types';
import { getChildRatios } from './zoneStats';
import { applySplitRatios, minZoneSizeMm, moveDivider, nudgeDivider, setZoneSize } from './zoneResize';

function leaf(id: string): Zone {
  return { id, type: 'leaf', content: 'empty' };
}

const columns = (ratios?: number[]): Zone => ({
  id: 'root',
  type: 'vertical',
  splitRatios: ratios,
  children: [leaf('a'), leaf('b'), leaf('c')],
});

describe('moveDivider', () => {
  it('moves the limit between two neighbours only', () => {
    // Meuble de 1200 mm, trois colonnes égales : la limite a|b passe de 33,3 % à 40 %
    const ratios = moveDivider(columns(), 0, 40, 1200)!;
    expect(ratios[0]).toBeCloseTo(40, 3);
    expect(ratios[1]).toBeCloseTo(100 / 3 - (40 - 100 / 3), 3);
    expect(ratios[2]).toBeCloseTo(100 / 3, 3);
    expect(ratios.reduce((sum, r) => sum + r, 0)).toBeCloseTo(100, 3);
  });

  it('stops at the minimum compartment width instead of freezing', () => {
    // 200 mm minimum sur 1200 mm : 16,67 % ; on tire bien au-delà
    const ratios = moveDivider(columns(), 0, 1, 1200)!;
    expect(ratios[0]).toBeCloseTo((200 / 1200) * 100, 3);
    const other = moveDivider(columns(), 0, 99, 1200)!;
    expect(other[1]).toBeCloseTo((200 / 1200) * 100, 3);
    expect(other[2]).toBeCloseTo(100 / 3, 3);
  });

  it('keeps a nested group above the sum of its own minimums', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      children: [{ id: 'g', type: 'vertical', children: [leaf('g0'), leaf('g1')] }, leaf('b')],
    };
    expect(minZoneSizeMm(root.children![0], 'width')).toBe(400);
    const ratios = moveDivider(root, 0, 0, 1200)!;
    expect(ratios[0]).toBeCloseTo((400 / 1200) * 100, 3);
  });

  it('lets an undersized zone grow but never shrink further', () => {
    // a ne fait que 120 mm (sous le minimum) : elle ne rétrécit pas, mais peut grandir
    const root = columns([10, 45, 45]);
    expect(moveDivider(root, 0, 5, 1200)).toBeNull();
    expect(moveDivider(root, 0, 20, 1200)![0]).toBeCloseTo(20, 3);
  });

  it('ignores moves smaller than the requested step and invalid dividers', () => {
    expect(moveDivider(columns(), 0, 100 / 3 + 0.2, 1200, 0.5)).toBeNull();
    expect(moveDivider(columns(), 2, 50, 1200)).toBeNull();
    expect(moveDivider(leaf('x'), 0, 50, 1200)).toBeNull();
  });

  it('nudges by a number of millimetres', () => {
    const ratios = nudgeDivider(columns(), 1, 60, 1200)!;
    // la limite b|c avance de 60 mm = 5 %
    expect(ratios[1]).toBeCloseTo(100 / 3 + 5, 3);
    expect(ratios[2]).toBeCloseTo(100 / 3 - 5, 3);
  });
});

describe('applySplitRatios', () => {
  it('keeps splitRatio and splitRatios in agreement for two children', () => {
    const root: Zone = { id: 'root', type: 'horizontal', splitRatio: 50, children: [leaf('a'), leaf('b')] };
    const next = applySplitRatios(root, 'root', [30, 70]);
    expect(next.splitRatio).toBe(30);
    expect(next.splitRatios).toEqual([30, 70]);
    expect(getChildRatios(next)).toEqual([30, 70]);
  });

  it('only touches the targeted group, and ignores a wrong number of ratios', () => {
    const root: Zone = { id: 'root', type: 'vertical', children: [{ id: 'g', type: 'horizontal', children: [leaf('a'), leaf('b')] }, leaf('c')] };
    const next = applySplitRatios(root, 'g', [25, 75]);
    expect(next.children![0].splitRatios).toEqual([25, 75]);
    expect(next.splitRatios).toBeUndefined();
    expect(applySplitRatios(root, 'g', [10, 20, 70])).toEqual(root);
  });
});

describe('setZoneSize', () => {
  it('writes ratios that every reader agrees on', () => {
    // Un splitRatio périmé masquait autrefois le nouveau réglage
    const root: Zone = { id: 'root', type: 'vertical', splitRatio: 50, children: [leaf('a'), leaf('b')] };
    const next = setZoneSize(root, 'a', 'width', 300, 1200, 700);
    expect(next.splitRatio).toBeCloseTo(25, 6);
    expect(getChildRatios(next)[0]).toBeCloseTo(25, 6);
  });
});
