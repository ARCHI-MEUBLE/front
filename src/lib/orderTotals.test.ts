import { describe, expect, it } from 'vitest';
import { cartTotals, orderPayment, paymentLinkLines, sumItems } from './orderTotals';

describe('sumItems', () => {
  it('adds unit price × quantity, amounts sent as numbers or text', () => {
    const items = [
      { unit_price: '12.50', quantity: 2 },
      { unit_price: 0.1, quantity: 3 },
    ];
    expect(sumItems(items, (item) => item.unit_price, (item) => item.quantity)).toBe(25.3);
    expect(sumItems(null, () => 1, () => 1)).toBe(0);
  });
});

describe('cartTotals', () => {
  const parts = { furniture: 1340, facades: 72.5, catalogue: 30, samples: 0 };

  it('adds every kind of item, catalogue included, then the shipping', () => {
    expect(cartTotals(parts, 63.9)).toEqual({ ...parts, items: 1442.5, shipping: 63.9, total: 1506.4 });
  });

  it('gives the items total when the shipping is unknown', () => {
    expect(cartTotals(parts, null)).toMatchObject({ items: 1442.5, shipping: null, total: 1442.5 });
  });
});

describe('orderPayment', () => {
  it('splits the order total into items and shipping', () => {
    expect(orderPayment({ total: '1394.00', shipping_amount: '54.00', payment_status: 'pending' })).toEqual({
      items: 1340,
      shipping: 54,
      total: 1394,
      paid: 0,
      remaining: 1394,
      state: 'pending',
    });
  });

  it('counts only the deposit once it is paid', () => {
    const order = {
      total: 1000,
      payment_status: 'partially_paid',
      payment_strategy: 'deposit',
      deposit_amount: '300.00',
      remaining_amount: '700.00',
      deposit_payment_status: 'paid',
      balance_payment_status: 'pending',
    };
    expect(orderPayment(order)).toMatchObject({ paid: 300, remaining: 700, state: 'partially_paid' });
    expect(orderPayment({ ...order, balance_payment_status: 'paid' })).toMatchObject({ paid: 1000, remaining: 0, state: 'paid' });
  });

  it('treats a fully paid order as paid, and a 0 € order as free', () => {
    expect(orderPayment({ total: 72.5, payment_status: 'paid' })).toMatchObject({ paid: 72.5, remaining: 0, state: 'paid' });
    expect(orderPayment({ total: 0, payment_status: 'paid' })).toMatchObject({ state: 'free' });
  });

  it('reads total_amount when the API sends it instead of total, and no shipping as 0', () => {
    expect(orderPayment({ total_amount: '250.00' })).toMatchObject({ items: 250, shipping: 0, total: 250, state: 'pending' });
  });
});

describe('paymentLinkLines', () => {
  it('lists furniture, facades, catalogue items and samples with their order prices', () => {
    const lines = paymentLinkLines({
      configurations: [{ id: 1, name: 'Buffet', quantity: 1, unit_price: 1340, total_price: 1340 }],
      facades: [{ id: 2, quantity: 2, unit_price: '72.50', config: { width: 600, height: 800 } }],
      catalogue: [{ id: 3, name: 'Poignée laiton', variation_name: 'Or', quantity: 4, unit_price: 12 }],
      samples: [
        { id: 4, name: 'Chêne clair', quantity: 1, price: 0 },
        { id: 5, name: 'Noyer', quantity: 2, price: '3.50' },
      ],
    });
    expect(lines.map(({ label, detail, amount }) => ({ label, detail, amount }))).toEqual([
      { label: 'Buffet', detail: 'Quantité : 1', amount: 1340 },
      { label: 'Façade 60 × 80 cm', detail: 'Quantité : 2', amount: 145 },
      { label: 'Poignée laiton', detail: 'Or · Quantité : 4', amount: 48 },
      { label: 'Chêne clair', detail: 'Échantillon × 1', amount: 0 },
      { label: 'Noyer', detail: 'Échantillon × 2', amount: 7 },
    ]);
  });

  it('accepts the order API names and a facade config sent as JSON text', () => {
    const lines = paymentLinkLines({
      facade_items: [{ quantity: 1, total_price: '80.00', config_data: '{"width":500,"height":1000}' }],
      catalogue_items: [{ item_name: 'Pied', quantity: 1, total_price: 20 }],
    });
    expect(lines.map((line) => line.label)).toEqual(['Façade 50 × 100 cm', 'Pied']);
    expect(lines.map((line) => line.amount)).toEqual([80, 20]);
  });

  it('returns no line for a missing or malformed list', () => {
    expect(paymentLinkLines(undefined)).toEqual([]);
    expect(paymentLinkLines({ configurations: 'oops' })).toEqual([]);
  });
});
