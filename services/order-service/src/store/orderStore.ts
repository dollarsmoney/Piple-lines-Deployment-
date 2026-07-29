import { randomUUID } from 'node:crypto';
import { NotFoundError, type Order, type OrderItem, type OrderTotals, type ShippingAddress } from '@ecom/shared';

const ordersByUser = new Map<string, Order[]>();

let sequence = 1000;

/** Human-quotable reference for the confirmation page, e.g. "ORD-1042". */
function nextReference(): string {
  sequence += 1;
  return `ORD-${sequence}`;
}

export interface CreateOrderInput {
  userId: string;
  items: OrderItem[];
  totals: OrderTotals;
  shippingAddress: ShippingAddress;
}

export function createOrder({
  userId,
  items,
  totals,
  shippingAddress,
}: CreateOrderInput): Order {
  const order: Order = {
    id: `ord_${randomUUID()}`,
    reference: nextReference(),
    userId,
    items,
    totals,
    // No real payment provider in this demo — orders land already paid.
    status: 'paid',
    shippingAddress,
    createdAt: new Date().toISOString(),
  };

  ordersByUser.set(userId, [order, ...(ordersByUser.get(userId) ?? [])]);
  return order;
}

/** Newest first — createOrder already prepends. */
export function listOrders(userId: string): Order[] {
  return ordersByUser.get(userId) ?? [];
}

/**
 * Scoped by userId on purpose: guessing another customer's order id must not
 * be enough to read it.
 */
export function requireOrder(userId: string, orderId: string): Order {
  const order = (ordersByUser.get(userId) ?? []).find(
    (candidate) => candidate.id === orderId || candidate.reference === orderId
  );

  if (!order) {
    throw new NotFoundError('Order');
  }

  return order;
}

export function reset(): void {
  ordersByUser.clear();
  sequence = 1000;
}
