import { describe, expect, it } from 'vitest';
import { averageRating, formatRating } from './rating';

describe('averageRating', () => {
  it('averages the ratings', () => {
    expect(averageRating([5, 4, 5, 4, 4, 5, 5, 4])).toBe(4.5);
  });

  it('returns 0 when there is no rating', () => {
    expect(averageRating([])).toBe(0);
  });
});

describe('formatRating', () => {
  it('uses a decimal comma and one decimal', () => {
    expect(formatRating(4.5)).toBe('4,5');
    expect(formatRating(5)).toBe('5,0');
    expect(formatRating(4.26)).toBe('4,3');
  });
});
