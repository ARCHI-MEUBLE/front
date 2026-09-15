import { describe, expect, it } from 'vitest';
import { normalizeMaterialKey, materialLabelFromKey } from './materials';

describe('normalizeMaterialKey', () => {
    it('defaults to agglomere when given nothing', () => {
        expect(normalizeMaterialKey(null)).toBe('agglomere');
        expect(normalizeMaterialKey(undefined)).toBe('agglomere');
        expect(normalizeMaterialKey('')).toBe('agglomere');
    });

    it('recognizes agglomere case-insensitively and accent-insensitively', () => {
        expect(normalizeMaterialKey('Agglomere')).toBe('agglomere');
        expect(normalizeMaterialKey('agglomeré')).toBe('agglomere');
    });

    it('recognizes the legacy mdf_melamine spellings', () => {
        expect(normalizeMaterialKey('mdf_melamine')).toBe('mdf_melamine');
        expect(normalizeMaterialKey('MDF + revetement (melamine)')).toBe('mdf_melamine');
    });

    it('recognizes the legacy plaque_bois spellings', () => {
        expect(normalizeMaterialKey('plaque_bois')).toBe('plaque_bois');
        expect(normalizeMaterialKey('Plaque bois')).toBe('plaque_bois');
    });

    it('passes through new admin-managed material keys unchanged', () => {
        expect(normalizeMaterialKey('chene-massif')).toBe('chene-massif');
    });
});

describe('materialLabelFromKey', () => {
    it('returns the key as-is', () => {
        expect(materialLabelFromKey('chene-massif')).toBe('chene-massif');
    });
});
