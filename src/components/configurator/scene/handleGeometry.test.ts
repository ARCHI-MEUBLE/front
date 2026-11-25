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
    modelHandleLength,
    safeFinishHex,
    type HandleFacade,
} from './handleGeometry';

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
