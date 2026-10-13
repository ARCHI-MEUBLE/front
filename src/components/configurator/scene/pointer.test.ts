import { describe, expect, it } from 'vitest';
import { CLICK_TOLERANCE_PX, DOUBLE_CLICK_MS, createDoubleClickDetector, isRealClick } from './pointer';

describe('isRealClick', () => {
  it('accepts a click that barely moved and rejects a drag', () => {
    expect(isRealClick({ delta: 0 })).toBe(true);
    expect(isRealClick({ delta: CLICK_TOLERANCE_PX.mouse })).toBe(true);
    expect(isRealClick({ delta: CLICK_TOLERANCE_PX.mouse + 1 })).toBe(false);
    expect(isRealClick({ delta: 60 })).toBe(false);
  });

  it('is more tolerant with a finger than with a mouse', () => {
    const touch = { nativeEvent: { pointerType: 'touch' } };
    expect(isRealClick({ ...touch, delta: 10 })).toBe(true);
    expect(isRealClick({ nativeEvent: { pointerType: 'mouse' }, delta: 10 })).toBe(false);
    expect(isRealClick({ ...touch, delta: CLICK_TOLERANCE_PX.touch + 1 })).toBe(false);
  });
});

describe('createDoubleClickDetector', () => {
  it('detects two quick clicks on the same zone', () => {
    const detector = createDoubleClickDetector();
    expect(detector.register('a', 1000)).toBe(false);
    expect(detector.register('a', 1000 + DOUBLE_CLICK_MS - 10)).toBe(true);
  });

  it('ignores slow clicks and clicks on different zones', () => {
    const detector = createDoubleClickDetector();
    detector.register('a', 1000);
    expect(detector.register('a', 1000 + DOUBLE_CLICK_MS + 50)).toBe(false);
    detector.register('a', 5000);
    expect(detector.register('b', 5100)).toBe(false);
  });

  it('does not chain a third click into another double-click', () => {
    const detector = createDoubleClickDetector();
    detector.register('a', 0);
    expect(detector.register('a', 100)).toBe(true);
    expect(detector.register('a', 200)).toBe(false);
    expect(detector.register('a', 300)).toBe(true);
  });

  it('can be reset', () => {
    const detector = createDoubleClickDetector();
    detector.register('a', 0);
    detector.reset();
    expect(detector.register('a', 50)).toBe(false);
  });
});
