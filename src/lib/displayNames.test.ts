import { describe, expect, it } from 'vitest';
import { displayColorName, displayMaterialName } from './displayNames';

describe('displayMaterialName', () => {
  it('restores the accents of the known materials', () => {
    expect(displayMaterialName('Agglomere')).toBe('Aggloméré');
    expect(displayMaterialName('MDF + revetement (melamine)')).toBe('MDF + revêtement (mélaminé)');
    expect(displayMaterialName('Plaque bois')).toBe('Plaqué bois');
  });

  it('keeps unknown materials and empty values as they are', () => {
    expect(displayMaterialName('Chêne massif')).toBe('Chêne massif');
    expect(displayMaterialName(null)).toBe('');
  });
});

describe('displayColorName', () => {
  it('restores the accents of the known colors', () => {
    expect(displayColorName('Chene naturel')).toBe('Chêne naturel');
    expect(displayColorName('Vert foret profonde')).toBe('Vert forêt profonde');
  });

  it('is stable when the name already has its accents', () => {
    expect(displayColorName('Chêne naturel')).toBe('Chêne naturel');
  });

  it('keeps other names untouched', () => {
    expect(displayColorName('Ambre solaire')).toBe('Ambre solaire');
    expect(displayColorName(undefined)).toBe('');
  });
});
