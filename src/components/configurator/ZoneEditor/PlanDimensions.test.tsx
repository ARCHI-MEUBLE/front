import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import ZoneEditor, { type Zone } from './index';
import { getZoneInteriorSizeMm } from '@/lib/configurator/zoneBounds';

vi.mock('react-hot-toast', () => ({ default: vi.fn() }));

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0));
  // jsdom ne mesure rien : sans largeur, le plan tomberait à 1 px et masquerait ses nombres
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1200 });
});

afterEach(() => vi.mocked(toast).mockClear());

const ROOT: Zone = {
  id: 'root',
  type: 'vertical',
  splitRatio: 50,
  children: [
    { id: 'root-0', type: 'leaf', content: 'door_double' },
    { id: 'root-1', type: 'leaf', content: 'door_double' },
  ],
};

function renderPlan(overrides: Partial<Parameters<typeof ZoneEditor>[0]> = {}) {
  const onRootZoneChange = vi.fn();
  const onFurnitureDimensionChange = vi.fn();
  render(
    <ZoneEditor
      rootZone={ROOT}
      selectedZoneIds={[]}
      onRootZoneChange={onRootZoneChange}
      onSelectedZoneIdsChange={() => {}}
      onSelectZone={() => {}}
      width={1510}
      height={1060}
      depth={500}
      hasSocle
      roundedRight
      roundedRightWidthMm={330}
      canvasMaxHeight={600}
      hideControls
      onFurnitureDimensionChange={onFurnitureDimensionChange}
      {...overrides}
    />
  );
  return { onRootZoneChange, onFurnitureDimensionChange };
}

const editor = () => screen.getByRole('textbox');
// La largeur du meuble figure sur la cote générale (en premier) et sur la bande du socle
const widthLine = () => screen.getAllByRole('button', { name: /^Largeur du meuble : 1840 mm/ })[0];

function typeAndPress(value: string, key: 'Enter' | 'Escape') {
  fireEvent.change(editor(), { target: { value } });
  fireEvent.keyDown(editor(), { key });
}

describe('cotes du plan 2D', () => {
  it('changes the width of the furniture from its dimension line', () => {
    const { onFurnitureDimensionChange } = renderPlan();
    fireEvent.doubleClick(widthLine());

    expect(editor()).toHaveValue('1840');
    expect(editor()).toHaveFocus();
    typeAndPress('2000', 'Enter');
    expect(onFurnitureDimensionChange).toHaveBeenCalledWith('width', 2000);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('keeps the furniture within its limits and says so', () => {
    const { onFurnitureDimensionChange } = renderPlan();
    fireEvent.doubleClick(screen.getByRole('button', { name: /^Hauteur du meuble : 1060 mm/ }));
    typeAndPress('3 m', 'Enter');
    expect(onFurnitureDimensionChange).toHaveBeenCalledWith('height', 2200);
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('Hauteur réglée sur 2200 mm'), expect.anything());
  });

  it('sets the inside width of a compartment from the number in its cell', () => {
    const { onRootZoneChange } = renderPlan();
    const [cell] = screen.getAllByRole('button', { name: /, 922 × 727 mm$/ });
    fireEvent.doubleClick(within(cell).getByRole('button', { name: /^Largeur intérieure de la case : 727 mm/ }));
    typeAndPress('800', 'Enter');

    const next = onRootZoneChange.mock.calls[0][0] as Zone;
    expect(getZoneInteriorSizeMm(next, 'root-0', 1510, 1060, true)?.width).toBeCloseTo(800, 0);
  });

  it('lists the inside width of each column, and the rounded side, between the overall line and the plan', () => {
    renderPlan();
    const chain = document.querySelector('[data-dimension-chain="horizontal"]') as HTMLElement;
    expect(within(chain).getAllByRole('button').map((value) => value.textContent)).toEqual(['727', '727']);
    expect(within(chain).getByTitle(/Largeur de l'arrondi droit : 330 mm/)).toBeInTheDocument();
  });

  it('explains instead of editing what the plan does not set', () => {
    renderPlan();
    const chain = document.querySelector('[data-dimension-chain="vertical"]') as HTMLElement;
    fireEvent.doubleClick(within(chain).getByTitle(/Hauteur du socle : 100 mm/));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(toast).toHaveBeenCalledWith('Le socle mesure toujours 100 mm de haut.', expect.anything());
  });

  it('cancels with Escape and refuses what is not a length', () => {
    const { onFurnitureDimensionChange } = renderPlan();
    fireEvent.doubleClick(screen.getByRole('button', { name: /^Profondeur du meuble : 500 mm/ }));
    typeAndPress('beaucoup', 'Enter');
    expect(screen.getByText(/Tapez une longueur/)).toBeInTheDocument();
    expect(editor()).toBeInTheDocument();

    typeAndPress('600', 'Escape');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(onFurnitureDimensionChange).not.toHaveBeenCalled();
  });

  it('validates with the ✓ button, and steps with the arrow keys', () => {
    const { onFurnitureDimensionChange } = renderPlan();
    fireEvent.doubleClick(screen.getByRole('button', { name: /^Profondeur du meuble : 500 mm/ }));
    fireEvent.keyDown(editor(), { key: 'ArrowUp', shiftKey: true });
    fireEvent.keyDown(editor(), { key: 'ArrowUp' });
    expect(editor()).toHaveValue('511');
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(onFurnitureDimensionChange).toHaveBeenCalledWith('depth', 511);
  });

  it('opens with two quick taps on a touch screen', () => {
    renderPlan();
    const value = widthLine();
    fireEvent.pointerUp(value, { pointerType: 'touch', clientX: 10, clientY: 10 });
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.pointerUp(value, { pointerType: 'touch', clientX: 12, clientY: 11 });
    expect(editor()).toHaveValue('1840');
  });

  it('opens from the keyboard and gives the focus back after Enter', async () => {
    renderPlan();
    fireEvent.keyDown(widthLine(), { key: 'Enter' });
    typeAndPress('1840', 'Enter');
    await act(() => new Promise((resolve) => setTimeout(resolve, 5)));
    expect(widthLine()).toHaveFocus();
  });

  it('stays read-only without a way to save the change', () => {
    renderPlan({ onFurnitureDimensionChange: undefined });
    expect(document.querySelectorAll('[data-editable]')).toHaveLength(0);
    expect(screen.queryByText(/une mesure pour la changer/)).toBeNull();
    fireEvent.doubleClick(screen.getByText('1840 mm'));
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
