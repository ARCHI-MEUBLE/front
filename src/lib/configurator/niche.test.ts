import { describe, expect, it } from 'vitest';
import { nicheDefaultColor } from './niche';

describe('nicheDefaultColor', () => {
  it('darkens the back colour of the furniture', () => {
    expect(nicheDefaultColor('#FFFFFF')).toBe('#c7c7c7');
    expect(nicheDefaultColor('#000000')).toBe('#000000');
  });

  it('returns an unreadable colour as it is', () => {
    expect(nicheDefaultColor('tomato')).toBe('tomato');
  });

  it('falls back to a neutral tone when there is no colour', () => {
    expect(nicheDefaultColor(undefined)).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
