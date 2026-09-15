import { describe, expect, it } from 'vitest';
import { normalizeZoneSplitRatios } from './zoneUtils';
import type { Zone } from '@/components/configurator/ZoneEditor';

function leaf(id: string): Zone {
    return { id, type: 'leaf' } as Zone;
}

describe('normalizeZoneSplitRatios', () => {
    it('leaves ratios that already sum to 100 unchanged', () => {
        const zone = { id: 'root', type: 'vertical', splitRatios: [50, 50], children: [leaf('a'), leaf('b')] } as Zone;
        const result = normalizeZoneSplitRatios(zone);
        expect(result.splitRatios).toEqual([50, 50]);
    });

    it('adjusts the last ratio so the sum becomes 100', () => {
        const zone = { id: 'root', type: 'vertical', splitRatios: [30, 30], children: [leaf('a'), leaf('b')] } as Zone;
        const result = normalizeZoneSplitRatios(zone);
        expect(result.splitRatios!.reduce((a, b) => a + b, 0)).toBe(100);
        expect(result.splitRatios).toEqual([30, 70]);
    });

    it('recurses into children', () => {
        const child = { id: 'child', type: 'vertical', splitRatios: [40, 40], children: [leaf('a'), leaf('b')] } as Zone;
        const zone = { id: 'root', type: 'horizontal', children: [child] } as Zone;
        const result = normalizeZoneSplitRatios(zone);
        expect(result.children![0].splitRatios!.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('leaves a zone without splitRatios untouched', () => {
        const zone = leaf('a');
        expect(normalizeZoneSplitRatios(zone)).toEqual(zone);
    });
});
