import { describe, expect, it } from 'vitest';
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT_RATE,
  calculateShipping,
  calculateSubtotal,
  calculateTax,
  calculateTotals,
  countItems,
} from './pricing.js';
import { formatMoney, paginate } from './http.js';

describe('calculateSubtotal', () => {
  it('multiplies price by quantity across every line', () => {
    expect(
      calculateSubtotal([
        { price: 1999, quantity: 2 },
        { price: 500, quantity: 3 },
      ])
    ).toBe(5498);
  });

  it('is 0 for an empty cart', () => {
    expect(calculateSubtotal([])).toBe(0);
  });
});

describe('calculateShipping', () => {
  it('charges the flat rate below the free-shipping threshold', () => {
    expect(calculateShipping(FREE_SHIPPING_THRESHOLD - 1)).toBe(SHIPPING_FLAT_RATE);
  });

  it('is free exactly at the threshold', () => {
    expect(calculateShipping(FREE_SHIPPING_THRESHOLD)).toBe(0);
  });

  it('charges nothing for an empty cart', () => {
    expect(calculateShipping(0)).toBe(0);
  });
});

describe('calculateTax', () => {
  it('rounds to the nearest cent rather than truncating', () => {
    // 1999 * 0.08 = 159.92
    expect(calculateTax(1999)).toBe(160);
  });
});

describe('calculateTotals', () => {
  it('sums subtotal, shipping and tax', () => {
    const totals = calculateTotals([{ price: 2500, quantity: 2 }]);

    expect(totals.subtotal).toBe(5000);
    expect(totals.shipping).toBe(SHIPPING_FLAT_RATE);
    expect(totals.tax).toBe(400);
    expect(totals.total).toBe(5000 + SHIPPING_FLAT_RATE + 400);
  });

  it('drops the shipping line once the order qualifies for free shipping', () => {
    const totals = calculateTotals([{ price: 12000, quantity: 1 }]);

    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(12000 + totals.tax);
  });
});

describe('countItems', () => {
  it('counts units, not lines', () => {
    expect(countItems([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it('slices the requested page', () => {
    const result = paginate(items, 2, 10);

    expect(result.items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(result.totalPages).toBe(3);
    expect(result.total).toBe(25);
  });

  it('clamps an out-of-range page to the last page', () => {
    expect(paginate(items, 99, 10).page).toBe(3);
  });

  it('reports one page for an empty list', () => {
    expect(paginate([], 1, 10)).toMatchObject({ total: 0, totalPages: 1, items: [] });
  });
});

describe('formatMoney', () => {
  it('renders cents as a currency string', () => {
    expect(formatMoney(129900)).toBe('$1,299.00');
  });
});
