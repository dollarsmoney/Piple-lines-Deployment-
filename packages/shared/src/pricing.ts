import type { CartItem, OrderTotals } from './types.js';

/** All amounts are in cents. */
export const FREE_SHIPPING_THRESHOLD = 10_000; // $100.00
export const SHIPPING_FLAT_RATE = 799; // $7.99
export const TAX_RATE = 0.08;

export function calculateSubtotal(items: Pick<CartItem, 'price' | 'quantity'>[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function calculateShipping(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;
}

export function calculateTax(subtotal: number): number {
  return Math.round(subtotal * TAX_RATE);
}

export function calculateTotals(items: Pick<CartItem, 'price' | 'quantity'>[]): OrderTotals {
  const subtotal = calculateSubtotal(items);
  const shipping = calculateShipping(subtotal);
  const tax = calculateTax(subtotal);

  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}

export function countItems(items: Pick<CartItem, 'quantity'>[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
