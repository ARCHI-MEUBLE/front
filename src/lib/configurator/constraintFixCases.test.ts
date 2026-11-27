import { describe, expect, it } from 'vitest';
import type { Zone } from '@/components/configurator/ZoneEditor/types';
import { describeConstraintFix, fixConstraintIssues } from './constraintFix';
import { findConstraintIssues } from './constraints';

const leaf = (id: string, extra: Partial<Zone> = {}): Zone => ({ id, type: 'leaf', content: 'empty', ...extra });

// Meuble de la capture : 2000 mm dont un arrondi droit de 330 mm, soit 1670 mm à partager entre les colonnes
const ROUNDED = { width: 2000, height: 1080, depth: 330, usableWidth: 1670 };
const screenshotFurniture = (): Zone => ({
  id: 'root',
  type: 'vertical',
  splitRatios: [16.8, 16.8, 46.4, 20],
  children: [leaf('a', { content: 'door_double' }), leaf('b', { content: 'door_double' }), leaf('c'), leaf('d')],
});

describe('Corriger : mêmes dimensions que la vérification', () => {
  it('fixes the 28 cm double doors of a furniture with a rounded side', () => {
    const root = screenshotFurniture();
    expect(findConstraintIssues(root, ROUNDED).map((issue) => issue.message)).toEqual([
      'Double porte de 28 cm de large : Min 30 cm.',
      'Double porte de 28 cm de large : Min 30 cm.',
    ]);

    const fix = fixConstraintIssues(root, ROUNDED);

    expect(fix.root.children!.map((child) => child.content)).toEqual(['door', 'door', 'empty', 'empty']);
    expect(fix.changes).toEqual(['Double porte de 28 cm remplacée par une porte simple.']);
    expect(fix.remaining).toEqual([]);
    // La page revérifie avec les dimensions corrigées : plus rien à signaler
    expect(findConstraintIssues(fix.root, fix.dims)).toEqual([]);
  });

  it('keeps the width of the rounded sides when the overall width is brought back within limits', () => {
    const fix = fixConstraintIssues(leaf('root'), { width: 3000, height: 1000, depth: 400, usableWidth: 2670 });
    expect(fix.dims).toMatchObject({ width: 2800, usableWidth: 2470 });
  });

  it('widens the furniture when its rounded sides leave no room for a compartment', () => {
    // 80 cm dont deux arrondis de 33 cm : 14 cm à l'intérieur
    const dims = { width: 800, height: 1000, depth: 400, usableWidth: 140, roundedWidth: 660 };
    expect(findConstraintIssues(leaf('root'), dims)).toHaveLength(1);

    const fix = fixConstraintIssues(leaf('root'), dims);

    expect(fix.dims).toMatchObject({ width: 860, usableWidth: 200 });
    expect(fix.changes).toEqual(['Largeur portée à 86 cm : les bords arrondis laissent la place d\'un compartiment.']);
    expect(fix.remaining).toEqual([]);
  });
});

describe('Corriger : porte trop large sur un groupe de colonnes', () => {
  it('gives each column its own door instead of removing it', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      doorContent: 'door',
      children: [leaf('a'), leaf('b', { content: 'dressing' }), leaf('c', { content: 'drawer' })],
    };
    const dims = { width: 1800, height: 2000, depth: 600 };
    expect(findConstraintIssues(root, dims).map((issue) => issue.message)).toEqual(['Porte de 180 cm de large : Max 60 cm : double porte.']);

    const fix = fixConstraintIssues(root, dims);

    expect(fix.remaining).toEqual([]);
    expect(fix.root.doorContent).toBeUndefined();
    expect(fix.root.children!.map((child) => child.content)).toEqual(['door', 'door', 'drawer']);
    // La penderie reste dans sa colonne, derrière la porte
    expect(fix.root.children![1].hasDressing).toBe(true);
    expect(fix.changes[0]).toBe('Porte de 180 cm de large remplacée par une porte par colonne.');
  });

  it('opens the doors of the right half to the right', () => {
    const root: Zone = { id: 'root', type: 'vertical', doorContent: 'push_door', children: ['a', 'b', 'c', 'd'].map((id) => leaf(id)) };
    const fix = fixConstraintIssues(root, { width: 2000, height: 1000, depth: 400 });

    expect(fix.remaining).toEqual([]);
    expect(fix.root.children!.map((child) => child.content)).toEqual(['push_door', 'push_door', 'push_door_right', 'push_door_right']);
  });

  it('puts the door on nested groups too, and leaves columns that already have a front', () => {
    const root: Zone = {
      id: 'root',
      type: 'vertical',
      doorContent: 'door_double',
      children: [
        { id: 'shelves', type: 'horizontal', children: [leaf('s1'), leaf('s2')] },
        leaf('drawer', { content: 'drawer' }),
        leaf('open'),
      ],
    };
    const fix = fixConstraintIssues(root, { width: 1500, height: 1200, depth: 450 });

    expect(fix.remaining).toEqual([]);
    expect(fix.root.children![0].doorContent).toBe('door_double');
    expect(fix.root.children![1].content).toBe('drawer');
    expect(fix.root.children![2].content).toBe('door_double');
  });
});

describe('describeConstraintFix', () => {
  it('never shows « undefined »', () => {
    expect(describeConstraintFix([])).toBe('Meuble corrigé.');
    expect(describeConstraintFix(['Hauteur ramenée à 220 cm.'])).toBe('Meuble corrigé : Hauteur ramenée à 220 cm.');
    expect(describeConstraintFix(['A.', 'B.', 'C.'])).toBe('Meuble corrigé : A. (et 2 autres modifications)');
  });
});
