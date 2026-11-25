import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FacadeConfig } from '@/types/facade';
import {
  EMPTY_FACADE_SETTINGS,
  billedHinges,
  facadeMaxSize,
  facadePriceBreakdown,
  facadeSizeIssue,
  fetchFacadeSettings,
  parseFacadeSettings,
  type FacadeSettings,
} from './facadePricing';

const SETTINGS: FacadeSettings = {
  ...EMPTY_FACADE_SETTINGS,
  materialPricePerM2: 150,
  hingeBasePrice: 34.2,
  hingeCoefficient: 0.05,
  maxWidth: 600,
  maxHeight: 2300,
  fixedDepth: 19,
};

const facade = (overrides: Partial<FacadeConfig> = {}): FacadeConfig => ({
  width: 600,
  height: 800,
  depth: 19,
  material: { id: 1, name: 'Chêne', color_hex: '#D8C7A1', price_modifier: 0, price_per_m2: 150, is_active: true },
  hinges: { type: 'no-hole-no-hinge', count: 3, direction: 'right' },
  drillings: [],
  ...overrides,
});

afterEach(() => vi.unstubAllGlobals());

describe('parseFacadeSettings', () => {
  it('reads the admin settings, numbers sent as text', () => {
    const settings = parseFacadeSettings([
      { setting_key: 'hinge_base_price', setting_value: '40.00' },
      { setting_key: 'hinge_coefficient', setting_value: '0.03' },
      { setting_key: 'max_width', setting_value: '3000' },
      { setting_key: 'unknown_key', setting_value: '12' },
    ]);
    expect(settings).toEqual({ ...EMPTY_FACADE_SETTINGS, hingeBasePrice: 40, hingeCoefficient: 0.03, maxWidth: 3000 });
  });

  it('keeps 0 (free hinges, no supplement) and ignores negative or unreadable values', () => {
    const settings = parseFacadeSettings([
      { setting_key: 'hinge_base_price', setting_value: '0' },
      { setting_key: 'hinge_coefficient', setting_value: '-1' },
      { setting_key: 'material_price_per_m2', setting_value: '' },
    ]);
    expect(settings.hingeBasePrice).toBe(0);
    expect(settings.hingeCoefficient).toBeNull();
    expect(settings.materialPricePerM2).toBeNull();
  });

  it('gives no setting for a malformed answer', () => {
    expect(parseFacadeSettings(null)).toEqual(EMPTY_FACADE_SETTINGS);
  });
});

describe('fetchFacadeSettings', () => {
  it('reads the public settings', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [{ setting_key: 'hinge_base_price', setting_value: '34.20' }] })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchFacadeSettings()).resolves.toMatchObject({ hingeBasePrice: 34.2 });
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/api/facade-settings.php');
  });
});

describe('facadePriceBreakdown (same formula as FacadePriceCalculator)', () => {
  it('prices the surface with the material price per m²', () => {
    expect(facadePriceBreakdown(facade(), SETTINGS)).toMatchObject({ surfaceM2: 0.48, surface: 72, hinges: 0, supplement: 0, unitPrice: 72 });
  });

  it('adds the hinges and the supplement of coefficient × hinges on surface + hinges', () => {
    const breakdown = facadePriceBreakdown(
      facade({
        width: 500,
        height: 1000,
        material: { id: 2, name: 'Noyer', color_hex: '#5C4033', price_modifier: 0, price_per_m2: 180, is_active: true },
        hinges: { type: 'hole-with-applied-hinge', count: 3, direction: 'left' },
      }),
      { ...SETTINGS, hingeBasePrice: 40, hingeCoefficient: 0.03 },
    );
    expect(breakdown).toMatchObject({ surface: 90, hingeCount: 3, hinges: 120 });
    expect(breakdown?.unitPrice).toBe(228.9);
  });

  it('applies a 0 coefficient instead of falling back to 5 %', () => {
    const breakdown = facadePriceBreakdown(
      facade({
        width: 500,
        height: 1000,
        material: { id: 2, name: 'Noyer', color_hex: '#5C4033', price_modifier: 0, price_per_m2: 180, is_active: true },
        hinges: { type: 'hole-with-twin-hinge', count: 2, direction: 'left' },
      }),
      { ...SETTINGS, hingeCoefficient: 0 },
    );
    expect(breakdown?.unitPrice).toBe(158.4);
  });

  it('uses the admin default price per m² when the material has none', () => {
    const material = { id: 0, name: 'Façade', color_hex: '#D8C7A1', price_modifier: 0, price_per_m2: 0, is_active: true };
    expect(facadePriceBreakdown(facade({ material }), { ...SETTINGS, materialPricePerM2: 200 })?.unitPrice).toBe(96);
  });

  it('bills only the drillings of an admin drilling type', () => {
    const drillings = [
      { id: 'h1', type: 'circular', typeName: 'Trous pour charnières', x: 5, y: 10, diameter: 26, price: 0 },
      { id: 'd1', type: 'circular', typeName: 'Passe-câble', drilling_type_id: 3, x: 50, y: 50, diameter: 60, price: 8.5 },
      { id: 'd2', type: 'circular', typeName: 'Sans type', x: 50, y: 60, diameter: 10, price: 99 },
    ];
    expect(facadePriceBreakdown(facade({ drillings }), SETTINGS)).toMatchObject({ drillings: 8.5, unitPrice: 80.5 });
  });

  it('gives no price rather than a wrong one when a needed setting is missing', () => {
    const noMaterialPrice = { id: 0, name: 'Façade', color_hex: '#D8C7A1', price_modifier: 0, price_per_m2: 0, is_active: true };
    expect(facadePriceBreakdown(facade({ material: noMaterialPrice }), EMPTY_FACADE_SETTINGS)).toBeNull();
    const withHinges = facade({ hinges: { type: 'hole-with-applied-hinge', count: 2, direction: 'left' } });
    expect(facadePriceBreakdown(withHinges, { ...SETTINGS, hingeBasePrice: null })).toBeNull();
    expect(facadePriceBreakdown(facade(), EMPTY_FACADE_SETTINGS)?.unitPrice).toBe(72);
  });
});

describe('billedHinges', () => {
  it('counts no hinge without hinges, and at most 5', () => {
    expect(billedHinges({ type: 'no-hole-no-hinge', count: 4 })).toBe(0);
    expect(billedHinges({ type: 'hole-with-applied-hinge', count: 9 })).toBe(5);
    expect(billedHinges(null)).toBe(0);
  });
});

describe('facade size limits', () => {
  it('reads the admin maximums, with the server fallback', () => {
    expect(facadeMaxSize(SETTINGS)).toEqual({ width: 600, height: 2300 });
    expect(facadeMaxSize(EMPTY_FACADE_SETTINGS)).toEqual({ width: 3000, height: 3000 });
  });

  it('explains a size the server would refuse', () => {
    expect(facadeSizeIssue({ width: 700, height: 800 }, SETTINGS)).toBe('Largeur maximale : 60 cm.');
    expect(facadeSizeIssue({ width: 600, height: 2400 }, SETTINGS)).toBe('Hauteur maximale : 230 cm.');
    expect(facadeSizeIssue({ width: 40, height: 800 }, SETTINGS)).toBe('Une façade mesure au moins 5 cm de côté.');
    expect(facadeSizeIssue({ width: 600, height: 800 }, SETTINGS)).toBeNull();
  });
});
