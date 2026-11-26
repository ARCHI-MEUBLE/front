import { describe, expect, it } from 'vitest';
import type { Zone } from '@/components/configurator/ZoneEditor/types';
import { getZoneInteriorSizeMm } from './zoneBounds';
import {
  clampFurnitureDimension,
  parsePlanLength,
  planChain,
  planResizeNotice,
  resizeFromPlan,
  type PlanFrame,
} from './planDimensions';

// Meuble de la capture : 1840 mm dont un arrondi droit de 330 mm, 1060 mm de haut sur socle, deux colonnes
const FRAME: PlanFrame = { usableWidthMm: 1510, heightMm: 1060, hasSocle: true, roundedWidthMm: 330 };
const twoColumns = (): Zone => ({
  id: 'root',
  type: 'vertical',
  splitRatio: 50,
  children: [
    { id: 'root-0', type: 'leaf', content: 'door_double' },
    {
      id: 'root-1',
      type: 'horizontal',
      splitRatio: 50,
      children: [
        { id: 'root-1-0', type: 'leaf', content: 'empty' },
        { id: 'root-1-1', type: 'leaf', content: 'empty' },
      ],
    },
  ],
});

const interior = (root: Zone, id: string, frame = FRAME) =>
  getZoneInteriorSizeMm(root, id, frame.usableWidthMm, frame.heightMm, frame.hasSocle)!;

describe('parsePlanLength', () => {
  it('reads millimetres, centimetres and metres, with a comma or a dot', () => {
    expect(parsePlanLength('450')).toBe(450);
    expect(parsePlanLength(' 450 mm ')).toBe(450);
    expect(parsePlanLength('45 cm')).toBe(450);
    expect(parsePlanLength('1,2 m')).toBe(1200);
    expect(parsePlanLength('72.4')).toBe(72);
    expect(parsePlanLength('1 200')).toBe(1200);
  });

  it('refuses anything that is not a length', () => {
    expect(parsePlanLength('')).toBeNull();
    expect(parsePlanLength('abc')).toBeNull();
    expect(parsePlanLength('0')).toBeNull();
    expect(parsePlanLength('-20')).toBeNull();
    expect(parsePlanLength('12 pouces')).toBeNull();
  });
});

describe('resizeFromPlan', () => {
  it('gives a column the inside width typed in, its neighbour takes the rest', () => {
    const root = twoColumns();
    const before = interior(root, 'root-0').width + interior(root, 'root-1').width;
    const result = resizeFromPlan(root, 'root-0', 'width', 800, FRAME);

    expect(result?.kind).toBe('zone');
    if (result?.kind !== 'zone') return;
    expect(result.appliedMm).toBe(800);
    expect(interior(result.root, 'root-0').width).toBeCloseTo(800, 0);
    expect(interior(result.root, 'root-0').width + interior(result.root, 'root-1').width).toBeCloseTo(before, 6);
    expect(planResizeNotice(result)).toBeNull();
  });

  it('lets the last column push the partition before it', () => {
    const result = resizeFromPlan(twoColumns(), 'root-1', 'width', 900, FRAME);
    if (result?.kind !== 'zone') throw new Error('zone attendue');
    expect(interior(result.root, 'root-1').width).toBeCloseTo(900, 0);
  });

  it('changes the column when the width of one of its shelves is typed in', () => {
    const result = resizeFromPlan(twoColumns(), 'root-1-0', 'width', 600, FRAME);
    if (result?.kind !== 'zone') throw new Error('zone attendue');
    expect(interior(result.root, 'root-1').width).toBeCloseTo(600, 0);
    expect(interior(result.root, 'root-1-1').width).toBeCloseTo(600, 0);
  });

  it('sets the height of a shelf inside its column', () => {
    const result = resizeFromPlan(twoColumns(), 'root-1-1', 'height', 300, FRAME);
    if (result?.kind !== 'zone') throw new Error('zone attendue');
    expect(interior(result.root, 'root-1-1').height).toBeCloseTo(300, 0);
  });

  it('resizes the furniture when nothing shares that dimension', () => {
    // La hauteur de la porte double court sur tout le caisson : 900 mm intérieurs, deux planches, le socle
    const height = resizeFromPlan(twoColumns(), 'root-0', 'height', 900, FRAME);
    expect(height).toMatchObject({ kind: 'furniture', axis: 'height', furnitureMm: 900 + 38 + 100, appliedMm: 900 });

    // Largeur d'un meuble sans division : les deux côtés et l'arrondi s'ajoutent
    const single: Zone = { id: 'root', type: 'leaf', content: 'empty' };
    const width = resizeFromPlan(single, 'root', 'width', 1000, FRAME);
    expect(width).toMatchObject({ kind: 'furniture', axis: 'width', furnitureMm: 1000 + 38 + 330 });
  });

  it('keeps the minimum size of the neighbour and says why', () => {
    const result = resizeFromPlan(twoColumns(), 'root-0', 'width', 1400, FRAME);
    if (result?.kind !== 'zone') throw new Error('zone attendue');
    expect(result.appliedMm).toBeLessThan(1400);
    expect(interior(result.root, 'root-1').width).toBeGreaterThan(150);
    expect(planResizeNotice(result)).toBe(
      `Largeur réglée sur ${result.appliedMm} mm : la case voisine est déjà à sa taille minimale.`
    );

    const tooSmall = resizeFromPlan(twoColumns(), 'root-1-0', 'height', 20, FRAME);
    if (tooSmall?.kind !== 'zone') throw new Error('zone attendue');
    expect(tooSmall.appliedMm).toBeGreaterThan(20);
    expect(planResizeNotice(tooSmall)).toBe(`Hauteur réglée sur ${tooSmall.appliedMm} mm, la plus petite possible pour cette case.`);
  });

  it('keeps the furniture within its limits', () => {
    const single: Zone = { id: 'root', type: 'leaf', content: 'empty' };
    const result = resizeFromPlan(single, 'root', 'width', 5000, FRAME);
    expect(result).toMatchObject({ kind: 'furniture', furnitureMm: 2800, appliedMm: 2800 - 38 - 330 });
    expect(planResizeNotice(result!)).toBe('Largeur réglée sur 2432 mm : le meuble entier mesure au plus 2800 mm.');
  });

  it('ignores an unknown zone or a value that is not a length', () => {
    expect(resizeFromPlan(twoColumns(), 'nope', 'width', 500, FRAME)).toBeNull();
    expect(resizeFromPlan(twoColumns(), 'root-0', 'width', 0, FRAME)).toBeNull();
    expect(resizeFromPlan(twoColumns(), 'root-0', 'width', Number.NaN, FRAME)).toBeNull();
  });
});

describe('clampFurnitureDimension', () => {
  it('keeps a value within the limits and explains the change', () => {
    expect(clampFurnitureDimension('depth', 500)).toEqual({ valueMm: 500, notice: null });
    expect(clampFurnitureDimension('depth', 900)).toEqual({
      valueMm: 800,
      notice: 'Profondeur réglée sur 800 mm : le meuble mesure de 200 à 800 mm.',
    });
    expect(clampFurnitureDimension('height', 100).valueMm).toBe(300);
  });
});

describe('planChain', () => {
  it('measures each column inside, then the rounded side, along the whole width', () => {
    const chain = planChain(twoColumns(), 'width', FRAME, { leftMm: 0, rightMm: 330 });
    expect(chain.map((segment) => segment.key)).toEqual(['root-0', 'root-1', 'rounded-right']);
    expect(chain[0].startMm).toBe(0);
    expect(chain[2].endMm).toBe(1840);
    // Mêmes valeurs que dans les cases : tailles intérieures, planches déduites
    expect(chain[0].valueMm).toBe(Math.round(interior(twoColumns(), 'root-0').width));
    expect(chain[0].zoneId).toBe('root-0');
    expect(chain[2]).toMatchObject({ valueMm: 330, locked: 'rounded' });
  });

  it('measures the carcass inside and the base along the height', () => {
    const chain = planChain(twoColumns(), 'height', FRAME);
    expect(chain).toHaveLength(2);
    expect(chain[0]).toMatchObject({ key: 'carcass', startMm: 0, endMm: 960, valueMm: 922, zoneId: 'root' });
    expect(chain[1]).toMatchObject({ key: 'socle', startMm: 960, endMm: 1060, valueMm: 100, locked: 'socle' });
  });

  it('has a single segment when nothing divides that side', () => {
    const noBase = { ...FRAME, hasSocle: false };
    expect(planChain(twoColumns(), 'height', noBase)).toHaveLength(1);
  });
});
