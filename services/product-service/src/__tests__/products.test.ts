import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Product } from '@ecom/shared';
import { createApp } from '../app.js';
import { reset } from '../store/productStore.js';

const { app } = createApp();

beforeEach(() => {
  reset();
});

async function listProducts(query = '') {
  const res = await request(app).get(`/products${query}`);
  return res.body.data as { items: Product[]; total: number; page: number; totalPages: number };
}

describe('GET /products', () => {
  it('returns the first page with the default limit of 12', async () => {
    const page = await listProducts();

    expect(page.items).toHaveLength(12);
    expect(page.page).toBe(1);
    expect(page.total).toBeGreaterThan(12);
  });

  it('filters by category', async () => {
    const page = await listProducts('?category=Audio');

    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((p) => p.category === 'Audio')).toBe(true);
  });

  it('rejects an unknown category with 400', async () => {
    const res = await request(app).get('/products?category=Groceries');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('filters by a price window, inclusive at both ends', async () => {
    const page = await listProducts('?minPrice=10000&maxPrice=20000&limit=48');

    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((p) => p.price >= 10000 && p.price <= 20000)).toBe(true);
  });

  it('requires every search word to match', async () => {
    const both = await listProducts('?q=keystone%20keyboard&limit=48');
    const nonsense = await listProducts('?q=keystone%20submarine&limit=48');

    expect(both.items.length).toBeGreaterThan(0);
    expect(both.items.every((p) => p.brand === 'Keystone')).toBe(true);
    expect(nonsense.items).toHaveLength(0);
  });

  it('searches across tags and brand, not just the title', async () => {
    const page = await listProducts('?q=magsafe&limit=48');

    expect(page.items.map((p) => p.slug)).toContain('volt-magsafe-power-bank');
  });

  it('sorts by price ascending and descending', async () => {
    const asc = await listProducts('?sort=price-asc&limit=48');
    const desc = await listProducts('?sort=price-desc&limit=48');

    const ascPrices = asc.items.map((p) => p.price);
    expect(ascPrices).toEqual([...ascPrices].sort((a, b) => a - b));
    expect(desc.items[0]?.price).toBe(ascPrices.at(-1));
  });

  it('sorts by rating with review count as the tie-break', async () => {
    const page = await listProducts('?sort=rating&limit=48');
    const ratings = page.items.map((p) => p.rating);

    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
  });

  it('paginates without repeating an item across pages', async () => {
    const first = await listProducts('?page=1&limit=6');
    const second = await listProducts('?page=2&limit=6');

    const overlap = first.items.filter((a) => second.items.some((b) => b.id === a.id));
    expect(overlap).toHaveLength(0);
  });

  it('clamps a page beyond the end back to the last page', async () => {
    const page = await listProducts('?page=999&limit=12');

    expect(page.page).toBe(page.totalPages);
    expect(page.items.length).toBeGreaterThan(0);
  });
});

describe('GET /products/:id', () => {
  it('looks a product up by id', async () => {
    const res = await request(app).get('/products/prd_001');

    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe('aurora-over-ear-headphones');
  });

  it('also accepts the slug, since the storefront links by slug', async () => {
    const res = await request(app).get('/products/aurora-over-ear-headphones');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('prd_001');
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/products/prd_does_not_exist');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /products/:id/related', () => {
  it('suggests other products without including the product itself', async () => {
    const res = await request(app).get('/products/prd_001/related');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((p: Product) => p.id !== 'prd_001')).toBe(true);
  });
});

describe('POST /products/validate', () => {
  it('returns only the ids that exist', async () => {
    const res = await request(app)
      .post('/products/validate')
      .send({ productIds: ['prd_001', 'prd_ghost', 'prd_020'] });

    expect(res.status).toBe(200);
    expect(res.body.data.map((p: Product) => p.id).sort()).toEqual(['prd_001', 'prd_020']);
  });

  it('rejects an empty id list', async () => {
    const res = await request(app).post('/products/validate').send({ productIds: [] });

    expect(res.status).toBe(400);
  });

  it('is not shadowed by the /products/:id route', async () => {
    const res = await request(app)
      .post('/products/validate')
      .send({ productIds: ['prd_001'] });

    expect(res.status).toBe(200);
  });
});

describe('GET /categories', () => {
  it('summarises every category with a count and a from-price', async () => {
    const res = await request(app).get('/categories');

    expect(res.status).toBe(200);
    expect(res.body.data.map((c: { name: string }) => c.name)).toEqual([
      'Accessories',
      'Audio',
      'Computing',
      'Home',
      'Wearables',
    ]);
    expect(res.body.data.every((c: { count: number }) => c.count > 0)).toBe(true);
  });
});

describe('GET /products/meta', () => {
  it('reports the catalogue price range for the filter slider', async () => {
    const res = await request(app).get('/products/meta');

    expect(res.status).toBe(200);
    expect(res.body.data.priceRange.min).toBeLessThan(res.body.data.priceRange.max);
    expect(res.body.data.total).toBeGreaterThan(0);
  });
});
