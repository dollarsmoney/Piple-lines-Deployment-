import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';

/**
 * The gateway's whole job is routing and header handling, so these tests run it
 * against real (tiny) upstreams on ephemeral ports rather than mocking the
 * proxy away.
 */

interface Upstream {
  server: Server;
  url: string;
  /** Whatever the upstream last saw, so tests can assert on forwarded headers. */
  lastRequest: { path: string; headers: Record<string, unknown>; body: unknown } | null;
}

async function startUpstream(configure: (app: Express) => void): Promise<Upstream> {
  const app = express();
  app.use(express.json());

  const state: Upstream['lastRequest'] = null;
  const upstream = { lastRequest: state } as Upstream;

  app.use((req, _res, next) => {
    upstream.lastRequest = { path: req.path, headers: req.headers, body: req.body };
    next();
  });

  app.get('/health', (_req, res) => res.json({ data: { status: 'ok' } }));
  configure(app);

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  upstream.server = server;
  upstream.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return upstream;
}

let app: Express;
let auth: Upstream;
let product: Upstream;
let order: Upstream;

beforeAll(async () => {
  auth = await startUpstream((a) => {
    a.post('/auth/login', (_req, res) => res.json({ data: { token: 'stub-token' } }));
    a.get('/auth/me', (_req, res) => res.json({ data: { email: 'demo@shop.dev' } }));
  });

  product = await startUpstream((a) => {
    a.get('/products', (_req, res) => res.json({ data: { items: [], total: 0 } }));
    a.get('/products/:id', (req, res) => res.json({ data: { id: req.params.id } }));
    a.get('/categories', (_req, res) => res.json({ data: [] }));
  });

  order = await startUpstream((a) => {
    a.get('/cart', (req, res) => res.json({ data: { userId: req.header('x-user-id') } }));
    a.get('/orders', (req, res) => res.json({ data: { userId: req.header('x-user-id') } }));
  });

  process.env.AUTH_SERVICE_URL = auth.url;
  process.env.PRODUCT_SERVICE_URL = product.url;
  process.env.ORDER_SERVICE_URL = order.url;

  // Imported after the env is set, since config reads it at module load.
  const { createApp } = await import('../app.js');
  app = createApp().app;
});

afterAll(async () => {
  for (const upstream of [auth, product, order]) {
    await new Promise((resolve) => upstream.server.close(resolve));
  }
});

function tokenFor(sub = 'usr_1', email = 'demo@shop.dev') {
  return jwt.sign({ sub, email, name: 'Demo', role: 'customer' }, 'test-secret', {
    algorithm: 'HS256',
    expiresIn: '1h',
  });
}

describe('routing', () => {
  it('proxies /api/products to the product service and rewrites the path', async () => {
    const res = await request(app).get('/api/products?category=Audio');

    expect(res.status).toBe(200);
    expect(product.lastRequest?.path).toBe('/products');
  });

  it('proxies a nested product path', async () => {
    const res = await request(app).get('/api/products/prd_001');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('prd_001');
  });

  it('proxies /api/categories', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(product.lastRequest?.path).toBe('/categories');
  });

  it('proxies /api/auth and forwards the JSON body intact', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@shop.dev', password: 'demo1234' });

    expect(res.status).toBe(200);
    expect(auth.lastRequest?.path).toBe('/auth/login');
    expect(auth.lastRequest?.body).toEqual({ email: 'demo@shop.dev', password: 'demo1234' });
  });

  it('404s an unknown route instead of proxying it somewhere', async () => {
    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('authentication', () => {
  it('rejects an anonymous cart request before it reaches the order service', async () => {
    const res = await request(app).get('/api/cart');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ sub: 'usr_1', email: 'a@b.co', role: 'customer' }, 'test-secret', {
      algorithm: 'HS256',
      expiresIn: '-1h',
    });

    const res = await request(app).get('/api/cart').set('authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = jwt.sign({ sub: 'usr_admin' }, 'not-the-secret', { algorithm: 'HS256' });

    const res = await request(app).get('/api/cart').set('authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
  });

  it('injects x-user-id downstream for a valid token', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('authorization', `Bearer ${tokenFor('usr_42')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.userId).toBe('usr_42');
    expect(order.lastRequest?.headers['x-user-email']).toBe('demo@shop.dev');
  });

  it('lets anonymous callers browse the catalogue', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
  });
});

describe('identity header spoofing', () => {
  it('strips a client-supplied x-user-id on a protected route', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('x-user-id', 'usr_victim')
      .set('authorization', `Bearer ${tokenFor('usr_attacker')}`);

    // The token wins; the injected header never reaches the upstream.
    expect(res.body.data.userId).toBe('usr_attacker');
    expect(order.lastRequest?.headers['x-user-id']).toBe('usr_attacker');
  });

  it('a forged x-user-id alone does not authenticate anyone', async () => {
    const res = await request(app).get('/api/cart').set('x-user-id', 'usr_admin');

    expect(res.status).toBe(401);
  });

  it('strips x-user-role too, so role cannot be escalated at the edge', async () => {
    await request(app)
      .get('/api/cart')
      .set('x-user-role', 'admin')
      .set('authorization', `Bearer ${tokenFor('usr_1')}`);

    expect(order.lastRequest?.headers['x-user-role']).toBe('customer');
  });

  it('strips identity headers on public routes as well', async () => {
    await request(app).get('/api/products').set('x-user-id', 'usr_ghost');

    expect(product.lastRequest?.headers['x-user-id']).toBeUndefined();
  });
});

describe('request tracing', () => {
  it('forwards the request id to the upstream', async () => {
    await request(app).get('/api/products').set('x-request-id', 'req-abc-123');

    expect(product.lastRequest?.headers['x-request-id']).toBe('req-abc-123');
  });

  it('mints a request id when the client did not send one', async () => {
    const res = await request(app).get('/api/products');

    expect(res.headers['x-request-id']).toBeTruthy();
  });
});

describe('GET /health', () => {
  it('aggregates the state of every upstream', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'ok',
      service: 'api-gateway',
      dependencies: { auth: 'ok', product: 'ok', order: 'ok' },
    });
  });

  it('reports degraded with a 503 when an upstream is down', async () => {
    await new Promise((resolve) => order.server.close(resolve));

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.dependencies.order).toBe('unreachable');
  });
});
