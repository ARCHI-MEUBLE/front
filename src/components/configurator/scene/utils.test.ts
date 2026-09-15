import { describe, expect, it } from 'vitest';
import { DEFAULT_MATERIAL_COLOR, getHingeYPositions, getSafeColor } from './utils';

describe('getSafeColor', () => {
    it('returns the given color when it is a valid hex string', () => {
        expect(getSafeColor('#123ABC')).toBe('#123ABC');
    });

    it.each([null, undefined, '', 'null', 'undefined', 'not-a-hex-color'])(
        'falls back to the default color for %p',
        (input) => {
            expect(getSafeColor(input as string | null | undefined)).toBe(DEFAULT_MATERIAL_COLOR);
        },
    );
});

describe('getHingeYPositions', () => {
    it('places 2 hinges near the top and bottom for a short door', () => {
        const positions = getHingeYPositions(1.0);
        expect(positions).toHaveLength(2);
        expect(positions[0]).toBeCloseTo(0.35);
        expect(positions[1]).toBeCloseTo(-0.35);
    });

    it('adds a 3rd hinge at 1.5m', () => {
        expect(getHingeYPositions(1.5)).toHaveLength(3);
    });

    it('adds a 4th hinge at 2.0m', () => {
        expect(getHingeYPositions(2.0)).toHaveLength(4);
    });

    it('adds a 5th hinge at 2.5m', () => {
        expect(getHingeYPositions(2.5)).toHaveLength(5);
    });

    it('spreads more than 2 hinges evenly between the margins', () => {
        const positions = getHingeYPositions(2.0);
        const margin = 0.15;
        expect(positions[0]).toBeCloseTo(2.0 / 2 - margin);
        expect(positions[positions.length - 1]).toBeCloseTo(-(2.0 / 2 - margin));
    });
});
