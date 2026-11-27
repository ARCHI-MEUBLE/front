import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HandleModelPreview } from './HandleModelPreview';

const FLAT = {
  name: 'FLAT chromé, entraxe 128',
  shape: 'flat_bar' as const,
  finish_hex: '#D9DCDF',
  length_mm: 143,
  center_distance_mm: 128,
  image_url: '/images/handles/lmc/flat-chrome.webp',
};

describe('HandleModelPreview', () => {
  it('shows the photo of the model whole, not the drawing', () => {
    const { container } = render(<HandleModelPreview model={FLAT} />);
    const photo = screen.getByRole('img', { name: FLAT.name });
    expect(photo.tagName).toBe('IMG');
    expect(photo).toHaveAttribute('src', '/images/handles/lmc/flat-chrome.webp');
    expect(photo.className).toContain('object-contain');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('falls back to the drawing when the photo cannot be loaded', () => {
    const { container } = render(<HandleModelPreview model={FLAT} />);
    fireEvent.error(screen.getByRole('img', { name: FLAT.name }));
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('draws a model without a photo', () => {
    const { container } = render(<HandleModelPreview model={{ ...FLAT, image_url: null }} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
