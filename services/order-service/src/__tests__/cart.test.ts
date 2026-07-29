import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cart } from '@ecom/shared';
import { createApp } from '../app.js';
import { MAX_QUANTITY_PER_LINE, reset as resetCarts } from '../store/cartStore.js';
import { USER, makeProduct, stubCatalogue, stubCatalogueOffline } from './helpers.js';

const { app } = createApp();

const headphones = makeProduct();
const keyboard = makeProduct({ id: 'prd_022', title: 'Keystone Keyboard', price: 16900, stock: 3 });

beforeEach(() => {
  resetCarts();
  stubCatalogue([headphones, keyboard]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const asUser = (req: request.Test) => req.set('x-user-id', USER);

async function addToCart(productId: string, quantity?: number) {
  const res = await asUser(request(app).post('/cart/items')).send({ productId, quantity });
  return res;
}

describe('authentication', () => {
  it('rejects every cart route without an x-user-id header', async () => {
    const routes = [
      request(app).get('/cart'),
      request(app).post('/cart/items').send({ productId: 'prd_001' }),
      request(app).delete('/cart'),
    ];

    for (const route of routes) {
      const res = await route;
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
  });
});

describe('GET /cart', () => {
  it('returns an empty cart for a first-time shopper', async () => {
    const res = await asUser(request(app).get('/cart'));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ items: [], subtotal: 0, itemCount: 0 });
  });

  it("keeps each user's cart separate", async () => {
    await addToCart('prd_001', 2);

    const otherUser = await request(app).get('/cart').set('x-user-id', 'usr_someone_else');

    expect(otherUser.body.data.items).toHaveLength(0);
  });
});

describe('POST /cart/items', () => {
  it('adds a line using the catalogue price, not a client-supplied one', async () => {
    const res = await asUser(request(app).post('/cart/items')).send({
      productId: 'prd_001',
      quantity: 2,
      price: 1,
    });

    const cart = res.body.data as Cart;

    expect(res.status).toBe(201);
    expect(cart.items[0]).toMatchObject({ productId: 'prd_001', price: 29900, quantity: 2 });
    expect(cart.subtotal).toBe(59800);
  });

  it('merges a repeat add into the existing line', async () => {
    await addToCart('prd_001', 2);
    const res = await addToCart('prd_001', 3);
    const cart = res.body.data as Cart;

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(5);
    expect(cart.itemCount).toBe(5);
  });

  it('clamps the line to the stock on hand', async () => {
    // keyboard has stock: 3
    const res = await addToCart('prd_022', 10);

    expect(res.body.data.items[0].quantity).toBe(3);
  });

  it('clamps to the per-line cap even when stock is plentiful', async () => {
    await addToCart('prd_001', 20);
    const res = await addToCart('prd_001', 20);

    expect(res.body.data.items[0].quantity).toBe(MAX_QUANTITY_PER_LINE);
  });

  it('rejects a quantity of 0', async () => {
    const res = await addToCart('prd_001', 0);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for a product that is not in the catalogue', async () => {
    const res = await addToCart('prd_ghost', 1);

    expect(res.status).toBe(404);
  });

  it('rejects an item that is out of stock', async () => {
    stubCatalogue([makeProduct({ stock: 0 })]);
    const res = await addToCart('prd_001', 1);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('out of stock');
  });

  it('returns 503 rather than a 500 when the catalogue is unreachable', async () => {
    stubCatalogueOffline();
    const res = await addToCart('prd_001', 1);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});

describe('PATCH /cart/items/:productId', () => {
  it('updates the quantity and recomputes the subtotal', async () => {
    await addToCart('prd_001', 1);
    const res = await asUser(request(app).patch('/cart/items/prd_001')).send({ quantity: 3 });

    expect(res.body.data.items[0].quantity).toBe(3);
    expect(res.body.data.subtotal).toBe(89700);
  });

  it('removes the line when the quantity drops to 0', async () => {
    await addToCart('prd_001', 1);
    const res = await asUser(request(app).patch('/cart/items/prd_001')).send({ quantity: 0 });

    expect(res.body.data.items).toHaveLength(0);
    expect(res.body.data.subtotal).toBe(0);
  });

  it('rejects a negative quantity', async () => {
    const res = await asUser(request(app).patch('/cart/items/prd_001')).send({ quantity: -1 });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /cart', () => {
  it('removes a single line', async () => {
    await addToCart('prd_001', 1);
    await addToCart('prd_022', 1);

    const res = await asUser(request(app).delete('/cart/items/prd_001'));

    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].productId).toBe('prd_022');
  });

  it('empties the whole cart', async () => {
    await addToCart('prd_001', 2);
    await addToCart('prd_022', 1);

    const res = await asUser(request(app).delete('/cart'));

    expect(res.body.data).toMatchObject({ items: [], itemCount: 0, subtotal: 0 });
  });
});
