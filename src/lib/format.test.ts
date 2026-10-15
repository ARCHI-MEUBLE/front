import { describe, expect, it } from 'vitest';
import { formatDecimal, formatPrice } from './format';

// Intl met des espaces insécables (U+00A0 / U+202F) : on les ramène à des espaces simples pour comparer
const plain = (value: string) => value.replace(/[   ]/g, ' ');

describe('formatPrice', () => {
  it('drops the cents on a whole amount, like the configurator price', () => {
    expect(plain(formatPrice(899))).toBe('899 €');
    expect(plain(formatPrice(2480))).toBe('2 480 €');
    expect(plain(formatPrice(0))).toBe('0 €');
  });

  it('always shows two decimals otherwise, never one or three', () => {
    expect(plain(formatPrice(2480.5))).toBe('2 480,50 €');
    expect(plain(formatPrice(122.375))).toBe('122,38 €');
  });

  it('treats floating-point noise as a whole amount', () => {
    expect(plain(formatPrice(0.1 * 3 * 100))).toBe('30 €');
  });

  it('accepts amounts sent as text and missing amounts', () => {
    expect(plain(formatPrice('72.50'))).toBe('72,50 €');
    expect(plain(formatPrice(undefined))).toBe('0 €');
    expect(plain(formatPrice('abc'))).toBe('0 €');
  });
});

describe('formatDecimal', () => {
  it('uses a decimal comma with two decimals by default', () => {
    expect(formatDecimal(0.48)).toBe('0,48');
    expect(formatDecimal(1.2, 1)).toBe('1,2');
  });
});
