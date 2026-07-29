import {
  calculateSubtotal,
  countItems,
  type Cart,
  type CartItem,
  type Product,
} from '@ecom/shared';

const carts = new Map<string, CartItem[]>();

function toCart(userId: string, items: CartItem[]): Cart {
  return {
    userId,
    items,
    subtotal: calculateSubtotal(items),
    itemCount: countItems(items),
    updatedAt: new Date().toISOString(),
  };
}

export function getCart(userId: string): Cart {
  return toCart(userId, carts.get(userId) ?? []);
}

export function getItems(userId: string): CartItem[] {
  return carts.get(userId) ?? [];
}

export const MAX_QUANTITY_PER_LINE = 20;

/**
 * Adds to the existing line if the product is already in the cart. The result
 * is clamped to both the stock on hand and the per-line cap, so the cart can
 * never hold more than the warehouse can ship.
 */
export function addItem(userId: string, product: Product, quantity: number): Cart {
  const items = [...(carts.get(userId) ?? [])];
  const existing = items.find((item) => item.productId === product.id);
  const ceiling = Math.min(MAX_QUANTITY_PER_LINE, product.stock);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, ceiling);
    // Re-snapshot the price so a repeat add picks up a price change.
    existing.price = product.price;
  } else {
    items.push({
      productId: product.id,
      title: product.title,
      slug: product.slug,
      image: product.image,
      price: product.price,
      quantity: Math.min(quantity, ceiling),
    });
  }

  carts.set(userId, items);
  return toCart(userId, items);
}

/** A quantity of 0 removes the line, which is what the stepper's minus does. */
export function setQuantity(userId: string, productId: string, quantity: number): Cart {
  const items = (carts.get(userId) ?? [])
    .map((item) =>
      item.productId === productId
        ? { ...item, quantity: Math.min(quantity, MAX_QUANTITY_PER_LINE) }
        : item
    )
    .filter((item) => item.quantity > 0);

  carts.set(userId, items);
  return toCart(userId, items);
}

export function removeItem(userId: string, productId: string): Cart {
  const items = (carts.get(userId) ?? []).filter((item) => item.productId !== productId);

  carts.set(userId, items);
  return toCart(userId, items);
}

export function clearCart(userId: string): Cart {
  carts.delete(userId);
  return toCart(userId, []);
}

export function reset(): void {
  carts.clear();
}
