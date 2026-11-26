import { describe, expect, it } from 'vitest';
import {
    clampHandleLength,
    DEFAULT_HANDLE_LENGTH,
    DOOR_HANDLE_EDGE_OFFSET,
    FALLBACK_FINISH_HEX,
    HANDLE_MIN_LENGTH,
    layoutHandle,
    legacyHandleLength,
    legacyHandleType,
    modelHandleDimensions,
    modelHandleLength,
    safeFinishHex,
    type HandleFacade,
} from './handleGeometry';

describe('modelHandleDimensions', () => {
    // Fiches LMC : « entraxe (longueur x largeur x saillie) »
    const fil128 = { shape: 'bar' as const, length_mm: 138, center_distance_mm: 128, width_mm: 10, projection_mm: 30 };
    const safari = { shape: 'leather' as const, length_mm: 224, center_distance_mm: 160, width_mm: 24, projection_mm: 25 };

    it('draws a handle with the dimensions of its manufacturer drawing', () => {
        const fil = modelHandleDimensions(fil128, 0.138);
        expect(fil.spacing).toBeCloseTo(0.128);
        expect(fil.width).toBeCloseTo(0.01);
        expect(fil.projection).toBeCloseTo(0.03);

        const strap = modelHandleDimensions(safari, 0.224);
        expect(strap.spacing).toBeCloseTo(0.16);
        expect(strap.width).toBeCloseTo(0.024);
        expect(strap.projection).toBeCloseTo(0.025);
    });

    it('shrinks the centre distance with a handle shortened to fit a small facade', () => {
        expect(modelHandleDimensions(fil128, 0.069).spacing).toBeCloseTo(0.064);
        // Jamais plus que la longueur posée
        expect(modelHandleDimensions({ ...fil128, length_mm: null }, 0.1).spacing).toBeLessThanOrEqual(0.1);
    });

    it('keeps the former proportions of each shape when the drawing is not filled in', () => {
        const bar = modelHandleDimensions({ shape: 'bar', length_mm: 160 }, 0.16);
        expect(bar.spacing).toBeCloseTo(0.128);
        expect(bar.width).toBeCloseTo(0.012);
        expect(bar.projection).toBeCloseTo(0.026);
        expect(modelHandleDimensions({ shape: 'leather', length_mm: 160 }, 0.16).spacing).toBeCloseTo(0.144);
        expect(modelHandleDimensions({ shape: 'knob', length_mm: null }, 0).width).toBeCloseTo(0.027);
        expect(modelHandleDimensions({ shape: 'recessed', length_mm: null }, 0).width).toBeCloseTo(0.052);
    });

    it('sets a cup handle into the door, with only its rim standing out', () => {
        const living = modelHandleDimensions({ shape: 'cup', length_mm: 92, width_mm: 27 }, 0.092);
        expect(living.width).toBeCloseTo(0.027);
        expect(living.projection).toBeCloseTo(0.002);
        // Saillie 0 : à fleur de façade
        expect(modelHandleDimensions({ shape: 'cup', length_mm: 92, projection_mm: 0 }, 0.092).projection).toBe(0);
    });

    it('ignores unreadable dimensions', () => {
        const odd = modelHandleDimensions({ shape: 'bar', length_mm: 160, center_distance_mm: 0, width_mm: Number.NaN, projection_mm: -4 }, 0.16);
        expect(odd.spacing).toBeCloseTo(0.128);
        expect(odd.width).toBeCloseTo(0.012);
        expect(odd.projection).toBeCloseTo(0.026);
    });
});

describe('modelHandleLength', () => {
    it('converts the admin length from mm to m', () => {
        expect(modelHandleLength(192)).toBeCloseTo(0.192);
    });

    it.each([null, undefined, 0, -10, Number.NaN])('falls back to 160 mm for %p', (input) => {
        expect(modelHandleLength(input as number | null | undefined)).toBe(DEFAULT_HANDLE_LENGTH);
    });
});

describe('clampHandleLength', () => {
    it('keeps a handle that fits', () => {
        expect(clampHandleLength(0.16, 0.6)).toBeCloseTo(0.16);
    });

    it('caps at 80 % of a large front', () => {
        // 80 % de 0,4 = 0,32 ; 0,4 − 0,06 = 0,34 : la règle des 80 % l'emporte
        expect(clampHandleLength(0.5, 0.4)).toBeCloseTo(0.32);
    });

    it('keeps a 3 cm margin at each end of a small front', () => {
        // 80 % de 0,2 = 0,16 ; 0,2 − 0,06 = 0,14 : la marge l'emporte
        expect(clampHandleLength(0.192, 0.2)).toBeCloseTo(0.14);
    });

    it('never goes below 4 cm, even on a tiny front', () => {
        expect(clampHandleLength(0.16, 0.05)).toBe(HANDLE_MIN_LENGTH);
        expect(clampHandleLength(0.01, 0.6)).toBe(HANDLE_MIN_LENGTH);
    });
});

describe('layoutHandle', () => {
    const door = (hingeSide: 'left' | 'right'): HandleFacade => ({ kind: 'door', hingeSide, width: 0.5, height: 0.8 });
    const drawer: HandleFacade = { kind: 'drawer', width: 0.6, height: 0.2 };

    it('centres a drawer handle in both orientations', () => {
        expect(layoutHandle(drawer, 'horizontal', 0.16)).toEqual({ x: 0, y: 0, length: 0.16, vertical: false });
        const vertical = layoutHandle(drawer, 'vertical', 0.16);
        expect(vertical.x).toBe(0);
        expect(vertical.vertical).toBe(true);
        // Bornée par la hauteur du tiroir : 0,2 − 0,06
        expect(vertical.length).toBeCloseTo(0.14);
    });

    it('puts a vertical door handle 4 cm from the opening edge, at mid-height', () => {
        // Charnières à gauche : la porte s'ouvre par son bord droit (+largeur/2)
        const left = layoutHandle(door('left'), 'vertical', 0.16);
        expect(left.x).toBeCloseTo(0.25 - DOOR_HANDLE_EDGE_OFFSET);
        expect(left.y).toBe(0);
        expect(left.vertical).toBe(true);
        const right = layoutHandle(door('right'), 'vertical', 0.16);
        expect(right.x).toBeCloseTo(-0.25 + DOOR_HANDLE_EDGE_OFFSET);
    });

    it('keeps a horizontal door handle whole on the front, its end 4 cm from the opening edge', () => {
        const left = layoutHandle(door('left'), 'horizontal', 0.16);
        expect(left.x).toBeCloseTo(0.25 - 0.04 - 0.08);
        expect(left.x + left.length / 2).toBeCloseTo(0.25 - DOOR_HANDLE_EDGE_OFFSET);
        const right = layoutHandle(door('right'), 'horizontal', 0.16);
        expect(right.x).toBeCloseTo(-0.25 + 0.04 + 0.08);
    });

    it('shortens a long horizontal handle so it does not overflow a narrow door leaf', () => {
        const leaf: HandleFacade = { kind: 'door', hingeSide: 'left', width: 0.25, height: 0.8 };
        const layout = layoutHandle(leaf, 'horizontal', 0.2);
        expect(layout.length).toBeCloseTo(0.19);
        // Le bout côté charnières reste sur la façade
        expect(layout.x - layout.length / 2).toBeGreaterThan(-0.125);
    });

    it('places a handle without orientation (knob) like a vertical one, with no length', () => {
        const layout = layoutHandle(door('left'), null, 0);
        expect(layout).toEqual({ x: 0.25 - DOOR_HANDLE_EDGE_OFFSET, y: 0, length: 0, vertical: false });
        expect(layoutHandle(drawer, null, 0)).toEqual({ x: 0, y: 0, length: 0, vertical: false });
    });
});

describe('legacy handles', () => {
    it('keeps a known legacy type and falls back to the bar of the requested orientation', () => {
        expect(legacyHandleType('knob', 'vertical')).toBe('knob');
        expect(legacyHandleType('recessed', 'horizontal')).toBe('recessed');
        expect(legacyHandleType(null, 'vertical')).toBe('vertical_bar');
        expect(legacyHandleType(undefined, 'horizontal')).toBe('horizontal_bar');
        expect(legacyHandleType('something_else', 'horizontal')).toBe('horizontal_bar');
    });

    it('uses the original bar lengths, the horizontal one from the front width', () => {
        const facade = { width: 0.5, height: 0.8 };
        expect(legacyHandleLength('horizontal_bar', facade)).toBeCloseTo(0.2);
        expect(legacyHandleLength('vertical_bar', facade)).toBeCloseTo(0.2);
        expect(legacyHandleLength('horizontal_bar', { width: 2, height: 0.8 })).toBe(0.5);
        expect(legacyHandleLength('knob', facade)).toBe(0);
    });
});

describe('safeFinishHex', () => {
    it('keeps a #RRGGBB finish', () => {
        expect(safeFinishHex('#B08D57')).toBe('#B08D57');
    });

    it.each([null, undefined, '', 'B08D57', '#FFF', 'red'])('falls back for %p', (input) => {
        expect(safeFinishHex(input as string | null | undefined)).toBe(FALLBACK_FINISH_HEX);
    });
});
