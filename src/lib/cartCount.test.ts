import { afterEach, describe, expect, it, vi } from 'vitest';
import { countCartItems, fetchCartCount, notifyCartChanged, onCartChanged } from './cartCount';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('countCartItems', () => {
  it('adds samples, catalogue quantities, facades and configured furniture', () => {
    expect(countCartItems({
      configurations: { item_count: 1 },
      samples: { count: 3 },
      catalogue: { items: [{ quantity: 2 }, { quantity: 1 }] },
      facades: { count: 2 },
    })).toBe(9);
  });

  it('counts missing lists as empty', () => {
    expect(countCartItems({ samples: { count: 2 }, catalogue: null })).toBe(2);
    expect(countCartItems({})).toBe(0);
  });
});

describe('fetchCartCount', () => {
  it('reads each list under its own name and ignores the ones that fail', async () => {
    const bodies: Record<string, unknown> = {
      '/api/cart/samples': { count: 2 },
      '/api/cart/catalogue': { items: [{ quantity: 3 }] },
      '/backend/api/cart/facades.php': { count: 1 },
    };
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url in bodies ? { ok: true, json: async () => bodies[url] } : { ok: false, json: async () => ({}) }));

    expect(await fetchCartCount()).toBe(6);
  });

  it('returns 0 when the network is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));

    expect(await fetchCartCount()).toBe(0);
  });
});

describe('notifyCartChanged', () => {
  it('passes the known total to the listeners until they stop listening', () => {
    const listener = vi.fn();
    const stop = onCartChanged(listener);

    notifyCartChanged(4);
    notifyCartChanged();
    stop();
    notifyCartChanged(1);

    expect(listener.mock.calls).toEqual([[4], [undefined]]);
  });
});
