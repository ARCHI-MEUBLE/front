import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InstallationToggle from './InstallationToggle';
import ConfigRecap from './steps/ConfigRecap';
import type { PriceEstimate } from '@/lib/pricing';

// Intl sépare le montant et « € » par une espace insécable : ramenée à une espace simple pour comparer
const plain = (value: string | null | undefined) => (value ?? '').replace(/[  ]/g, ' ');

const ESTIMATE: PriceEstimate = { price: 1470, low: 1320, high: 1620, sigma: 150, lines: [], delivery: 54, installation: 90 };
const STATS = { compartments: 2, doors: 1, drawers: 0, niches: 1, lights: 0, cableHoles: 0, dressings: 0 } as never;

describe('InstallationToggle', () => {
  it('is a switch that turns the installation on and off', () => {
    const onChange = vi.fn();
    const { rerender } = render(<InstallationToggle checked={false} onChange={onChange} price={90} />);
    const toggle = screen.getByRole('switch', { name: /Pose \+ montage compris/ });

    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(plain(toggle.textContent)).toContain('+ 90 €');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenLastCalledWith(true);

    rerender(<InstallationToggle checked onChange={onChange} price={90} />);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it('hides the price until the estimate gives it', () => {
    render(<InstallationToggle checked={false} onChange={() => {}} price={null} />);
    expect(screen.getByRole('switch').textContent).not.toContain('€');
  });
});

describe('ConfigRecap installation row', () => {
  const recap = (installation: boolean) =>
    render(
      <ConfigRecap
        width={1700}
        depth={450}
        height={600}
        finish="Agglomere"
        colorLabel="Blanc"
        colorHex="#FFFFFF"
        mountingStyle="applique"
        socle="none"
        stats={STATS}
        installation={installation}
        estimate={ESTIMATE}
      />
    );

  it('shows the installation included in the furniture price, next to the delivery', () => {
    recap(true);
    expect(plain(screen.getByText('Pose et montage').nextElementSibling?.textContent)).toBe('Comprise dans le prix (90 €)');
    expect(screen.getByText('Livraison')).toBeTruthy();
  });

  it('says when only the delivery is ordered', () => {
    recap(false);
    expect(screen.getByText('Pose et montage').nextElementSibling?.textContent).toBe('Non comprise : livraison seule');
  });
});
