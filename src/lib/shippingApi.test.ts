import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCartShipping, parseCartShipping, shippingLines, shippingTotal, type CartShipping } from './shippingApi';

// Intl met des espaces insécables (U+00A0 / U+202F) : on les ramène à des espaces simples pour comparer
const plain = (value: string | null) => (value ?? '').replace(/[  ]/g, ' ');

const FREE: CartShipping = { furniture: 0, parcel: 0, total: 0, parcelFreeFrom: null };

afterEach(() => vi.unstubAllGlobals());

describe('parseCartShipping', () => {
  it('reads the amounts, sent as numbers or DECIMAL text', () => {
    expect(parseCartShipping({ furniture: '54.00', parcel: 9.9, total: '63.90', parcel_free_from: '80' })).toEqual({
      furniture: 54,
      parcel: 9.9,
      total: 63.9,
      parcelFreeFrom: 80,
    });
  });

  it('treats a missing or zero threshold as no threshold, and rebuilds a missing total', () => {
    expect(parseCartShipping({ furniture: 54, parcel: 0, parcel_free_from: 0 })).toEqual({ furniture: 54, parcel: 0, total: 54, parcelFreeFrom: null });
    expect(parseCartShipping(null)).toEqual(FREE);
  });
});

describe('fetchCartShipping', () => {
  it('reads the cart shipping of the signed-in customer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { furniture: 54, parcel: 0, total: 54, parcel_free_from: null } })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchCartShipping()).resolves.toEqual({ furniture: 54, parcel: 0, total: 54, parcelFreeFrom: null });
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/api/cart/shipping.php');
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
  });

  it('surfaces the backend error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: 'Non connecté' }), { status: 401 })));

    await expect(fetchCartShipping()).rejects.toThrow('Non connecté');
  });
});

describe('shippingLines', () => {
  it('shows only the lines of what the cart holds', () => {
    expect(shippingLines(FREE, { hasFurniture: false, hasParcelItems: false })).toEqual([]);
    expect(shippingLines(FREE, { hasFurniture: true, hasParcelItems: false }).map((line) => line.key)).toEqual(['furniture']);
    expect(shippingLines(FREE, { hasFurniture: false, hasParcelItems: true }).map((line) => line.key)).toEqual(['parcel']);
  });

  it('prints the fee, and « Offerte » only when it is 0', () => {
    const [furniture, parcel] = shippingLines(
      { furniture: 54, parcel: 0, total: 54, parcelFreeFrom: null },
      { hasFurniture: true, hasParcelItems: true },
    );
    expect(furniture).toMatchObject({ label: 'Livraison des meubles', amount: 54, note: null });
    expect(plain(furniture.value)).toBe('54 €');
    expect(parcel).toMatchObject({ label: 'Livraison colis', amount: 0, value: 'Offerte', note: null });
  });

  it('mentions the free-shipping threshold', () => {
    const paying = shippingLines({ furniture: 0, parcel: 9.9, total: 9.9, parcelFreeFrom: 80 }, { hasFurniture: false, hasParcelItems: true })[0];
    expect(plain(paying.value)).toBe('9,90 €');
    expect(plain(paying.note)).toBe("Offerte dès 80 € d'achat");

    const free = shippingLines({ furniture: 0, parcel: 0, total: 0, parcelFreeFrom: 80 }, { hasFurniture: false, hasParcelItems: true })[0];
    expect(free.value).toBe('Offerte');
    expect(plain(free.note)).toBe("Dès 80 € d'achat");
  });

  it('says « Comprise », not « Offerte », when every furniture price already includes delivery', () => {
    const [line] = shippingLines(FREE, { hasFurniture: true, furnitureDeliveryIncluded: true, hasParcelItems: false });
    expect(line.value).toBe('Comprise');
    expect(line.note).toBe('Déjà comprise dans le prix de vos meubles');
  });

  it('never hides a fee the server charges, so that the lines add up to its total', () => {
    const lines = shippingLines({ furniture: 54, parcel: 0, total: 54, parcelFreeFrom: null }, { hasFurniture: false, hasParcelItems: false });
    expect(lines.map((line) => line.key)).toEqual(['furniture']);
  });
});

describe('shippingTotal', () => {
  it('adds the shown lines', () => {
    expect(shippingTotal({ furniture: 54.1, parcel: 9.9, total: 64, parcelFreeFrom: null }, { hasFurniture: true, hasParcelItems: true })).toBe(64);
    expect(shippingTotal(FREE, { hasFurniture: true, hasParcelItems: true })).toBe(0);
  });
});
