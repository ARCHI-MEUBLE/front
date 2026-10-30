import { describe, expect, it } from 'vitest';
import { fixConstraintIssues } from './constraintFix';
import { findConstraintIssues } from './constraints';
import type { Zone } from '@/components/configurator/ZoneEditor/types';

function leaf(id: string, extra: Partial<Zone> = {}): Zone {
  return { id, type: 'leaf', content: 'empty', ...extra };
}

function allIds(zone: Zone, ids: string[] = []): string[] {
  ids.push(zone.id);
  zone.children?.forEach((child) => allIds(child, ids));
  return ids;
}

const dims = (width: number, height = 800, depth = 500) => ({ width, height, depth });

describe('fixConstraintIssues', () => {
  it('splits a 1.38 m stack of drawers into two stacks of 69 cm', () => {
    const root: Zone = { id: 'root', type: 'horizontal', children: [leaf('a', { content: 'drawer' }), leaf('b', { content: 'drawer' })] };
    expect(findConstraintIssues(root, dims(1380))).toHaveLength(2);

    const fix = fixConstraintIssues(root, dims(1380));

    expect(fix.remaining).toEqual([]);
    expect(fix.root.id).toBe('root');
    expect(fix.root.type).toBe('vertical');
    expect(fix.root.children).toHaveLength(2);
    for (const column of fix.root.children!) {
      expect(column.type).toBe('horizontal');
      expect(column.children!.map((drawer) => drawer.content)).toEqual(['drawer', 'drawer']);
    }
    expect(fix.changes).toEqual(['Partie de 138 cm de large partagée en 2 colonnes de 69 cm (tiroirs : 1,2 m max).']);
  });

  it('fixes a too-wide drawer column inside a larger furniture without touching the other columns', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      splitRatio: 60,
      children: [
        { id: 'left', type: 'horizontal', children: [leaf('d1', { content: 'drawer' }), leaf('d2', { content: 'drawer' })] },
        leaf('right', { content: 'door' }),
      ],
    };
    const fix = fixConstraintIssues(root, dims(2300));

    expect(fix.remaining).toEqual([]);
    expect(fix.root.splitRatio).toBe(60);
    expect(fix.root.children![0].type).toBe('vertical');
    // 920 mm : une porte simple devient double porte plutôt que d'ajouter une séparation
    expect(fix.root.children![1]).toMatchObject({ id: 'right', content: 'door_double' });
  });

  it('gives every new compartment a unique id', () => {
    const root: Zone = { id: 'root', type: 'horizontal', children: [leaf('a', { content: 'drawer' }), leaf('b', { content: 'drawer' })] };
    const ids = allIds(fixConstraintIssues(root, dims(2700)).root);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('opens the doors of split columns outwards', () => {
    const fix = fixConstraintIssues(leaf('root', { content: 'mirror_door' }), dims(800));
    expect(fix.remaining).toEqual([]);
    expect(fix.root.children!.map((column) => column.content)).toEqual(['mirror_door', 'mirror_door_right']);
  });

  it('splits shelves wider than 1 m into columns', () => {
    const root: Zone = { id: 'root', type: 'horizontal', children: [leaf('a'), leaf('b'), leaf('c')] };
    const fix = fixConstraintIssues(root, dims(2100, 1800));
    expect(fix.remaining).toEqual([]);
    expect(fix.root.children).toHaveLength(3);
  });

  it('evens out compartments that are too narrow when there is room', () => {
    const root: Zone = { id: 'root', type: 'vertical', splitRatio: 10, children: [leaf('a', { content: 'drawer' }), leaf('b')] };
    const fix = fixConstraintIssues(root, dims(1000));
    expect(fix.remaining).toEqual([]);
    expect(fix.root.splitRatio).toBe(50);
    // Le tiroir tient de nouveau : il est gardé
    expect(fix.root.children![0].content).toBe('drawer');
  });

  it('keeps fewer compartments when they cannot all fit', () => {
    const root: Zone = { id: 'root', type: 'vertical', children: ['a', 'b', 'c', 'd'].map((id) => leaf(id)) };
    const fix = fixConstraintIssues(root, dims(500));
    expect(fix.remaining).toEqual([]);
    expect(fix.root.children).toHaveLength(2);
  });

  it('removes what cannot be made, such as a drawer in a too-shallow furniture', () => {
    const fix = fixConstraintIssues(leaf('root', { content: 'drawer' }), dims(600, 800, 200));
    expect(fix.remaining).toEqual([]);
    expect(fix.root.content).toBe('empty');
    expect(fix.changes[0]).toMatch(/^Retiré : tiroir/);
  });

  it('brings dimensions back within limits', () => {
    const fix = fixConstraintIssues(leaf('root'), dims(1000, 2500));
    expect(fix.dims.height).toBe(2200);
    expect(fix.changes).toContain('Hauteur ramenée à 220 cm.');
  });

  it('leaves a buildable furniture unchanged', () => {
    const root: Zone = { id: 'root', type: 'vertical', children: [leaf('a', { content: 'drawer' }), leaf('b', { content: 'door' })] };
    const fix = fixConstraintIssues(root, dims(1000));
    expect(fix.root).toBe(root);
    expect(fix.changes).toEqual([]);
  });
});
