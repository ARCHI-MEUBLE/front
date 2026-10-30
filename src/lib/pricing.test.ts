import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPriceEstimate, formatPriceRange, type PricedConfiguration } from './pricing';

// Intl met des espaces insécables (U+00A0 / U+202F) : on les ramène à des espaces simples pour comparer
const plain = (value: string) => value.replace(/[  ]/g, ' ');

const CONFIG: PricedConfiguration = {
  dimensions: { width: 1700, height: 600, depth: 450 },
  styling: { materialKey: 'mdf_melamine', finish: 'MDF + revêtement (mélaminé)', socle: 'none' },
  features: { doorType: 'none' },
  advancedZones: { id: 'root', type: 'leaf', content: 'empty' },
};

afterEach(() => vi.unstubAllGlobals());

describe('formatPriceRange', () => {
  it('shows the euro sign once, after the upper bound', () => {
    expect(plain(formatPriceRange({ low: 1290, high: 1460 }))).toBe('1 290 – 1 460 €');
    expect(plain(formatPriceRange({ low: 670, high: 790 }))).toBe('670 – 790 €');
  });
});

describe('fetchPriceEstimate', () => {
  it('posts the configuration to the backend and returns its estimate', async () => {
    const estimate = { price: 1380, low: 1290, high: 1460, sigma: 90, lines: [] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: estimate })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPriceEstimate(CONFIG)).resolves.toEqual(estimate);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/backend/api/pricing/estimate.php');
    expect(JSON.parse(init.body)).toEqual({ config_data: CONFIG });
  });

  it('surfaces the backend error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: 'Configuration invalide' }), { status: 400 })));

    await expect(fetchPriceEstimate(CONFIG)).rejects.toThrow('Configuration invalide');
  });
});
