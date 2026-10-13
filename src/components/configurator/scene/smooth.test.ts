import { describe, expect, it } from 'vitest';
import { smoothStep } from './smooth';

describe('smoothStep', () => {
  it('moves toward the target without overshooting', () => {
    let value = 0;
    for (let i = 0; i < 20; i++) {
      const next = smoothStep(value, 1, 1 / 60);
      expect(next).toBeGreaterThan(value);
      expect(next).toBeLessThanOrEqual(1);
      value = next;
    }
  });

  it('moves about 10 % of the way per frame at 60 fps', () => {
    expect(smoothStep(0, 1, 1 / 60)).toBeCloseTo(0.1, 1);
  });

  it('covers the same distance whatever the frame rate', () => {
    let slow = 0;
    for (let i = 0; i < 30; i++) slow = smoothStep(slow, 1, 1 / 30);
    let fast = 0;
    for (let i = 0; i < 120; i++) fast = smoothStep(fast, 1, 1 / 120);
    expect(slow).toBeCloseTo(fast, 3);
  });

  it('settles exactly on the target', () => {
    let value = 0;
    for (let i = 0; i < 400; i++) value = smoothStep(value, -0.7, 1 / 60);
    expect(value).toBe(-0.7);
  });

  it('survives a very long frame (inactive tab)', () => {
    expect(smoothStep(0, 1, 30)).toBeCloseTo(1, 6);
  });
});
