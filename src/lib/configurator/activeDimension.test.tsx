import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LeafDims } from '@/components/configurator/ZoneEditor/ZoneCanvas';
import DimensionsPanel from '@/components/configurator/DimensionsPanel';
import {
  activeAxis,
  dimensionForDivider,
  getActiveDimension,
  setActiveDimension,
  splitDimsText,
  useActiveDimension,
} from './activeDimension';

afterEach(() => setActiveDimension(null));

describe('splitDimsText', () => {
  it('splits the height × width text of a 2D plan cell, in its full and short forms', () => {
    expect(splitDimsText('313 × 513 mm')).toEqual({ height: '313', separator: ' × ', width: '513', suffix: ' mm' });
    expect(splitDimsText('313×513')).toEqual({ height: '313', separator: '×', width: '513', suffix: '' });
  });

  it('leaves any other text whole', () => {
    expect(splitDimsText('Espace ouvert')).toBeNull();
    expect(splitDimsText('313 mm')).toBeNull();
  });
});

describe('dimensionForDivider', () => {
  it('lights the widths for a partition and the heights for a shelf', () => {
    expect(dimensionForDivider('vertical')).toEqual({ scope: 'zone', axis: 'width' });
    expect(dimensionForDivider('horizontal')).toEqual({ scope: 'zone', axis: 'height' });
    expect(dimensionForDivider('leaf')).toBeNull();
  });
});

describe('activeAxis', () => {
  it('tells the furniture dimension lines apart from the cells of the zones', () => {
    const furnitureWidth = { scope: 'furniture', axis: 'width' } as const;
    expect(activeAxis(furnitureWidth, 'furniture')).toBe('width');
    expect(activeAxis(furnitureWidth, 'zone')).toBeNull();
    expect(activeAxis(null, 'furniture')).toBeNull();
  });
});

describe('LeafDims', () => {
  const glowing = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[data-dimension]'))
      .filter((node) => node.className.includes('ring-1'))
      .map((node) => node.getAttribute('data-dimension'));

  it('lights the width or the height of the selected cell', () => {
    const width = render(<LeafDims text="313 × 513 mm" size={12} highlight="width" />);
    expect(glowing(width.container)).toEqual(['width']);
    expect(width.container.textContent).toBe('313 × 513 mm');

    const height = render(<LeafDims text="313×513" size={9} highlight="height" />);
    expect(glowing(height.container)).toEqual(['height']);
    expect(height.container.textContent).toBe('313×513');
  });

  it('keeps the plain text when nothing is being set', () => {
    const { container } = render(<LeafDims text="313 × 513 mm" size={12} highlight={null} />);
    expect(container.querySelectorAll('[data-dimension]')).toHaveLength(0);
    expect(container.textContent).toBe('313 × 513 mm');
  });
});

describe('useActiveDimension', () => {
  function Probe() {
    const active = useActiveDimension();
    return <span data-testid="probe">{active ? `${active.scope}:${active.axis}` : 'none'}</span>;
  }

  it('shares the dimension being set between the fields and the 2D plan', () => {
    render(<Probe />);
    expect(screen.getByTestId('probe').textContent).toBe('none');

    act(() => setActiveDimension({ scope: 'furniture', axis: 'width' }));
    expect(screen.getByTestId('probe').textContent).toBe('furniture:width');
    act(() => setActiveDimension({ scope: 'zone', axis: 'height' }));
    expect(getActiveDimension()).toEqual({ scope: 'zone', axis: 'height' });
    expect(screen.getByTestId('probe').textContent).toBe('zone:height');
    act(() => setActiveDimension(null));
    expect(screen.getByTestId('probe').textContent).toBe('none');
  });
});

describe('DimensionsPanel', () => {
  it('lights the width or height dimension line of the plan while the field is being set', () => {
    render(<DimensionsPanel width={1990} depth={500} height={800} onWidthChange={() => {}} onDepthChange={() => {}} onHeightChange={() => {}} />);
    const [widthField, depthField, heightField] = screen.getAllByRole('textbox');

    act(() => widthField.focus());
    expect(getActiveDimension()).toEqual({ scope: 'furniture', axis: 'width' });
    act(() => heightField.focus());
    expect(getActiveDimension()).toEqual({ scope: 'furniture', axis: 'height' });
    // La profondeur n'est pas sur le plan de face : rien à éclairer
    act(() => depthField.focus());
    expect(getActiveDimension()).toBeNull();
  });
});
