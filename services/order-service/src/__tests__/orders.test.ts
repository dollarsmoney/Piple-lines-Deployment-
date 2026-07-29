import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SHIPPING_FLAT_RATE, type Order } from '@ecom/shared';
import { createApp } from '../app.js';
import { reset as resetCarts } from '../store/cartStore.js';
import { reset as resetOrders } from '../store/orderStore.js';
import { ADDRESS, OTHER_USER, USER, makeProduct, stubCatalogue } from './helpers.js';

const { app } = createApp();

const headphones = makeProduct({ price: 4000, stock: 25 });
const keyboard = makeProduct({ id: 'prd_022', title: 'Keystone Keyboard', price: 1000, stock: 10 });

beforeEach(() => {
  resetCarts();
  resetOrders();
  stubCatalogue([headphones, keyboard]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const asUser = (req: request.Test, user = USER) => req.set('x-user-id', user);

async function seedCart(productId: string, quantity: number, user = USER) {
  return asUser(request(app).post('/cart/items'), user).send({ productId, quantity });
}

function checkout(user = USER) {
  return asUser(request(app).post('/orders'), user).send({ shippingAddress: ADDRESS });
}

describe('POST /orders', () => {
  it('turns the cart into a paid order with correct totals', async () => {
    await seedCart('prd_001', 1); // 4000
    await seedCart('prd_022', 2); // 2000  -> subtotal 6000, under free-shipping

    const res = await checkout();
    const order = res.body.data as Order;

    expect(res.status).toBe(201);
    expect(order.status).toBe('paid');
    expect(order.reference).toMatch(/^ORD-\d+$/);
    expect(order.totals.subtotal).toBe(6000);
    expect(order.totals.shipping).toBe(SHIPPING_FLAT_RATE);
    expect(order.totals.tax).toBe(480);
    expect(order.totals.total).toBe(6000 + SHIPPING_FLAT_RATE + 480);
  });

  it('records a lineTotal per item', async () => {
    await seedCart('prd_022', 3);

    const order = (await checkout()).body.data as Order;

    expect(order.items[0]).toMatchObject({ quantity: 3, price: 1000, lineTotal: 3000 });
  });

  it('waives shipping once the subtotal clears the threshold', async () => {
    await seedCart('prd_001', 3); // 12000

    const order = (await checkout()).body.data as Order;

    expect(order.totals.shipping).toBe(0);
  });

  it('empties the cart once the order is placed', async () => {
    await seedCart('prd_001', 1);
    await checkout();

    const cart = await asUser(request(app).get('/cart'));

    expect(cart.body.data.items).toHaveLength(0);
  });

  it('re-prices the order against the live catalogue', async () => {
    await seedCart('prd_001', 2); // snapshotted at 4000

    // The catalogue raises the price before the customer checks out.
    stubCatalogue([makeProduct({ price: 5000, stock: 25 }), keyboard]);

    const order = (await checkout()).body.data as Order;

    expect(order.items[0]?.price).toBe(5000);
    expect(order.totals.subtotal).toBe(10000);
  });

  it('refuses to check out an empty cart', async () => {
    const res = await checkout();

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Your cart is empty');
  });

  it('blocks checkout when stock dropped below the cart quantity', async () => {
    await seedCart('prd_001', 5);
    stubCatalogue([makeProduct({ price: 4000, stock: 2 }), keyboard]);

    const res = await checkout();

    expect(res.status).toBe(400);
    expect(res.body.error.details).toContain('Only 2 left of Aurora Over-Ear Headphones');
  });

  it('blocks checkout when an item was delisted', async () => {
    await seedCart('prd_001', 1);
    stubCatalogue([keyboard]);

    const res = await checkout();

    expect(res.status).toBe(400);
    expect(res.body.error.details[0]).toContain('no longer available');
  });

  it('leaves the cart intact when checkout fails', async () => {
    await seedCart('prd_001', 5);
    stubCatalogue([makeProduct({ price: 4000, stock: 1 }), keyboard]);

    await checkout();
    const cart = await asUser(request(app).get('/cart'));

    expect(cart.body.data.items).toHaveLength(1);
  });

  it('requires a shipping address', async () => {
    await seedCart('prd_001', 1);
    const res = await asUser(request(app).post('/orders')).send({});

    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/orders').send({ shippingAddress: ADDRESS });

    expect(res.status).toBe(401);
  });
});

describe('GET /orders', () => {
  it('lists the caller\'s orders newest first', async () => {
    await seedCart('prd_001', 1);
    await checkout();
    await seedCart('prd_022', 1);
    await checkout();

    const res = await asUser(request(app).get('/orders'));
    const orders = res.body.data as Order[];

    expect(orders).toHaveLength(2);
    expect(Date.parse(orders[0]!.createdAt)).toBeGreaterThanOrEqual(
      Date.parse(orders[1]!.createdAt)
    );
  });

  it('does not leak another shopper\'s orders', async () => {
    await seedCart('prd_001', 1, OTHER_USER);
    await checkout(OTHER_USER);

    const res = await asUser(request(app).get('/orders'));

    expect(res.body.data).toHaveLength(0);
  });
});

describe('GET /orders/:id', () => {
  it('fetches an order by id and by reference', async () => {
    await seedCart('prd_001', 1);
    const created = (await checkout()).body.data as Order;

    const byId = await asUser(request(app).get(`/orders/${created.id}`));
    const byRef = await asUser(request(app).get(`/orders/${created.reference}`));

    expect(byId.status).toBe(200);
    expect(byRef.body.data.id).toBe(created.id);
  });

  it('returns 404 when another user guesses the order id', async () => {
    await seedCart('prd_001', 1);
    const created = (await checkout()).body.data as Order;

    const res = await asUser(request(app).get(`/orders/${created.id}`), OTHER_USER);

    expect(res.status).toBe(404);
  });
});
