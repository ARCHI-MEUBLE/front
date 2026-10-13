import { describe, expect, it } from 'vitest';
import { layoutLeafText } from './leafLayout';

const base = { label: 'Tiroir', widthMm: 598, heightMm: 620, hasIcon: true };

describe('layoutLeafText', () => {
  it('shows icon, label and full dimensions in a large cell', () => {
    const layout = layoutLeafText({ ...base, pxWidth: 220, pxHeight: 180 });
    expect(layout.icon).toBe(20);
    expect(layout.label?.size).toBe(18);
    expect(layout.dims).toEqual({ text: '598 × 620 mm', size: 16 });
  });

  it('shortens the dimensions in a narrow column instead of overflowing', () => {
    const layout = layoutLeafText({ ...base, widthMm: 398, heightMm: 1240, pxWidth: 60, pxHeight: 300 });
    expect(layout.dims?.text).toBe('398×1240');
    expect(layout.dims!.text.length * layout.dims!.size * 0.6).toBeLessThanOrEqual(60);
  });

  it('keeps the icon but drops the text in a very small drawer cell', () => {
    const layout = layoutLeafText({ ...base, pxWidth: 40, pxHeight: 26 });
    expect(layout.icon).toBeGreaterThan(0);
    expect(layout.label).toBeNull();
    expect(layout.dims).toBeNull();
  });

  it('keeps the dimensions of an empty cell before its "Vide" label', () => {
    const layout = layoutLeafText({ label: 'Vide', widthMm: 398, heightMm: 124, hasIcon: false, pxWidth: 70, pxHeight: 26 });
    expect(layout.icon).toBe(0);
    expect(layout.dims?.text).toBe('398×124');
    expect(layout.label).toBeNull();
  });

  it('shows nothing in a cell of a few pixels', () => {
    expect(layoutLeafText({ ...base, pxWidth: 12, pxHeight: 10 })).toEqual({ icon: 0, label: null, dims: null });
  });

  it('shows everything at full size when the scale is unknown', () => {
    const layout = layoutLeafText({ ...base, pxWidth: Infinity, pxHeight: Infinity });
    expect(layout.icon).toBe(20);
    expect(layout.label?.size).toBe(18);
    expect(layout.dims?.size).toBe(16);
  });
});
