import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  currentEstimateIfDifferent,
  deliveryLabel,
  fetchPriceEstimate,
  formatPriceRange,
  installationLabel,
  parsePriceEstimate,
  savedQuoteFrom,
  type PricedConfiguration,
  type PriceEstimate,
} from './pricing';

// Intl met des espaces insécables (U+00A0 / U+202F) : on les ramène à des espaces simples pour comparer
const plain = (value: string | null) => (value ?? '').replace(/[  ]/g, ' ');

const CONFIG: PricedConfiguration = {
  dimensions: { width: 1700, height: 600, depth: 450 },
  styling: { materialKey: 'mdf_melamine', finish: 'MDF + revêtement (mélaminé)', socle: 'none', colorId: 4 },
  features: { doorType: 'none', mountingStyle: 'applique' },
  advancedZones: { id: 'root', type: 'leaf', content: 'drawer' },
  handles: { modelId: 2, doorOrientation: 'vertical', drawerOrientation: 'horizontal' },
  useMultiColor: true,
  componentColors: {
    structure: { colorId: 4, hex: '#FFFFFF' },
    doors: { colorId: 12, hex: '#8B5A2B' },
  },
  deletedPanelIds: ['left'],
};

const ESTIMATE: PriceEstimate = { price: 1380, low: 1290, high: 1460, sigma: 90, lines: [], delivery: 54, installation: 90 };

afterEach(() => vi.unstubAllGlobals());

describe('formatPriceRange', () => {
  it('shows the euro sign once, after the upper bound', () => {
    expect(plain(formatPriceRange({ low: 1290, high: 1460 }))).toBe('1 290 – 1 460 €');
    expect(plain(formatPriceRange({ low: 670, high: 790 }))).toBe('670 – 790 €');
  });
});

describe('parsePriceEstimate', () => {
  it('reads the furniture price and its separate delivery', () => {
    expect(parsePriceEstimate({ ...ESTIMATE, lines: [{ key: 'panels', label: 'Panneaux', amount: '208' }] })).toEqual({
      ...ESTIMATE,
      lines: [{ key: 'panels', label: 'Panneaux', amount: 208 }],
    });
  });

  it('leaves the delivery unknown when the backend does not send it', () => {
    expect(parsePriceEstimate({ price: 900, low: 800, high: 1000, sigma: 100, lines: [] }).delivery).toBeNull();
  });

  it('keeps a free delivery (0) apart from an unknown one', () => {
    expect(parsePriceEstimate({ ...ESTIMATE, delivery: 0 }).delivery).toBe(0);
  });

  it('reads the installation price, quoted even when it is not chosen', () => {
    expect(parsePriceEstimate({ ...ESTIMATE, installation: '286' }).installation).toBe(286);
    expect(parsePriceEstimate({ price: 900, low: 800, high: 1000, sigma: 100, lines: [] }).installation).toBeNull();
    expect(parsePriceEstimate({ ...ESTIMATE, installation: 'n/a' }).installation).toBeNull();
  });
});

describe('installationLabel', () => {
  it('says whether the installation is in the furniture price', () => {
    expect(plain(installationLabel(true, 90))).toBe('Comprise dans le prix (90 €)');
    expect(installationLabel(true, null)).toBe('Comprise dans le prix');
    expect(installationLabel(false, 90)).toBe('Non comprise : livraison seule');
  });
});

describe('deliveryLabel', () => {
  it('announces the delivery as a separate fee added to the cart', () => {
    expect(plain(deliveryLabel(54))).toBe('Livraison : 54 € (ajoutée au panier)');
  });

  it('says free only when the fee is 0, and nothing when it is unknown', () => {
    expect(deliveryLabel(0)).toBe('Livraison offerte');
    expect(deliveryLabel(null)).toBeNull();
  });
});

describe('fetchPriceEstimate', () => {
  it('posts the configuration to the backend and returns its estimate', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: ESTIMATE })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPriceEstimate(CONFIG)).resolves.toEqual(ESTIMATE);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/backend/api/pricing/estimate.php');
    expect(JSON.parse(init.body)).toEqual({ config_data: CONFIG });
  });

  it('sends what prices each part: handles, part colours and removed panels, as config_data is saved', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: ESTIMATE })));
    vi.stubGlobal('fetch', fetchMock);

    await fetchPriceEstimate(CONFIG);
    const { config_data } = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(config_data.handles).toEqual({ modelId: 2, doorOrientation: 'vertical', drawerOrientation: 'horizontal' });
    expect(config_data.advancedZones).toEqual({ id: 'root', type: 'leaf', content: 'drawer' });
    expect(config_data.useMultiColor).toBe(true);
    expect(config_data.componentColors.doors.colorId).toBe(12);
    expect(config_data.styling.colorId).toBe(4);
    expect(config_data.deletedPanelIds).toEqual(['left']);
  });

  it('surfaces the backend error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: 'Configuration invalide' }), { status: 400 })));

    await expect(fetchPriceEstimate(CONFIG)).rejects.toThrow('Configuration invalide');
  });
});

describe('savedQuoteFrom', () => {
  it('reads the quote of a saved configuration, flags sent as booleans or Postgres text', () => {
    expect(savedQuoteFrom({ price: '1340.00', price_adjusted: 't', price_note: ' Remise fidélité ', price_includes_delivery: false })).toEqual({
      price: 1340,
      adjusted: true,
      note: 'Remise fidélité',
      includesDelivery: false,
    });
  });

  it('treats configurations without the new columns as an unadjusted quote', () => {
    expect(savedQuoteFrom({ price: 990 })).toEqual({ price: 990, adjusted: false, note: null, includesDelivery: false });
  });

  it('returns null without a price', () => {
    expect(savedQuoteFrom({})).toBeNull();
    expect(savedQuoteFrom(null)).toBeNull();
  });
});

describe('currentEstimateIfDifferent', () => {
  const quote = { price: 1380, adjusted: false, note: null, includesDelivery: false };

  it('hides the current estimate when it matches the quote', () => {
    expect(currentEstimateIfDifferent(quote, ESTIMATE)).toBeNull();
    expect(currentEstimateIfDifferent(quote, null)).toBeNull();
  });

  it('shows it when the price grid changed since the quote', () => {
    expect(currentEstimateIfDifferent(quote, { ...ESTIMATE, price: 1420 })).toBe(1420);
  });

  it('compares an old quote that includes delivery with the estimate plus delivery', () => {
    const oldQuote = { ...quote, price: 1434, includesDelivery: true };
    expect(currentEstimateIfDifferent(oldQuote, ESTIMATE)).toBeNull();
    expect(currentEstimateIfDifferent(oldQuote, { ...ESTIMATE, delivery: 60 })).toBe(1440);
    expect(currentEstimateIfDifferent(oldQuote, { ...ESTIMATE, delivery: null })).toBeNull();
  });
});
