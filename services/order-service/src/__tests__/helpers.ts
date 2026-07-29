import { vi } from 'vitest';
import type { Product } from '@ecom/shared';

export const USER = 'usr_test_1';
export const OTHER_USER = 'usr_test_2';

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prd_001',
    slug: 'aurora-over-ear-headphones',
    title: 'Aurora Over-Ear Headphones',
    description: 'Reference-tuned cans.',
    price: 29900,
    compareAtPrice: null,
    currency: 'USD',
    category: 'Audio',
    brand: 'Aurora Audio',
    rating: 4.8,
    reviewCount: 10,
    stock: 25,
    tags: ['wireless'],
    image: 'https://example.test/aurora.jpg',
    createdAt: '2026-06-02T09:00:00.000Z',
    ...overrides,
  };
}

/**
 * Stubs global fetch so the suite exercises the real productClient code path
 * (timeouts, envelope unwrapping, 404 handling) without a live catalogue.
 */
export function stubCatalogue(products: Product[]) {
  const byId = new Map(products.map((product) => [product.id, product]));

  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.endsWith('/products/validate')) {
      const { productIds } = JSON.parse(String(init?.body ?? '{}')) as { productIds: string[] };
      const found = productIds.map((id) => byId.get(id)).filter(Boolean);

      return new Response(JSON.stringify({ data: found }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    const id = decodeURIComponent(url.split('/products/')[1] ?? '');
    const product = byId.get(id);

    if (!product) {
      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'not found' } }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ data: product }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Simulates the catalogue being down entirely. */
export function stubCatalogueOffline() {
  const fetchMock = vi.fn(async () => {
    throw new TypeError('fetch failed');
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export const ADDRESS = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  line1: '12 Analytical Way',
  city: 'London',
  postalCode: 'EC1A 1AA',
  country: 'United Kingdom',
};
