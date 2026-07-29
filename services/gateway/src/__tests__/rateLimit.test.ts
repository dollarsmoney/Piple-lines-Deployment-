import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express, { type Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Lives in its own file so it can lower the limit before the gateway's config
 * module is evaluated — the other suite deliberately runs with limits disabled.
 */

let app: Express;
let upstream: Server;

beforeAll(async () => {
  const stub = express();
  stub.get('/health', (_req, res) => res.json({ data: { status: 'ok' } }));
  stub.get('/products', (_req, res) => res.json({ data: { items: [] } }));

  upstream = await new Promise<Server>((resolve) => {
    const s = stub.listen(0, () => resolve(s));
  });

  const url = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;

  process.env.RATE_LIMIT_MAX = '3';
  process.env.PRODUCT_SERVICE_URL = url;
  process.env.AUTH_SERVICE_URL = url;
  process.env.ORDER_SERVICE_URL = url;

  const { createApp } = await import('../app.js');
  app = createApp().app;
});

afterAll(async () => {
  await new Promise((resolve) => upstream.close(resolve));
});

describe('global rate limiter', () => {
  it('serves requests up to the limit, then returns 429', async () => {
    const statuses: number[] = [];

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).get('/api/products');
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses.slice(3)).toEqual([429, 429]);
  });

  it('returns the standard error envelope when limiting', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});
