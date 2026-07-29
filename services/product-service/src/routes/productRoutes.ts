import { asyncHandler, delay, param, router, validate } from '@ecom/service-kit';
import { ok, productQuerySchema, validateProductsSchema, type ProductQuery } from '@ecom/shared';
import { config } from '../config.js';
import * as store from '../store/productStore.js';

export const productRoutes = router();

productRoutes.get(
  '/products',
  validate(productQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    await delay(config.artificialLatencyMs);

    res.json(ok(store.search(req.query as unknown as ProductQuery)));
  })
);

/** Powers the price slider bounds without the client fetching the whole catalogue. */
productRoutes.get(
  '/products/meta',
  asyncHandler(async (_req, res) => {
    res.json(
      ok({
        categories: store.categories(),
        priceRange: store.priceRange(),
        total: store.all().length,
      })
    );
  })
);

/**
 * Internal batch lookup used by order-service at checkout to re-price a cart
 * against the live catalogue. Declared before /products/:id so "validate" is
 * never swallowed as an id.
 */
productRoutes.post(
  '/products/validate',
  validate(validateProductsSchema),
  asyncHandler(async (req, res) => {
    const { productIds } = req.body as { productIds: string[] };

    res.json(ok(store.findManyByIds(productIds)));
  })
);

productRoutes.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    await delay(config.artificialLatencyMs);

    res.json(ok(store.requireById(param(req, 'id'))));
  })
);

productRoutes.get(
  '/products/:id/related',
  asyncHandler(async (req, res) => {
    await delay(config.artificialLatencyMs);

    res.json(ok(store.related(store.requireById(param(req, 'id')))));
  })
);

productRoutes.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    res.json(ok(store.categories()));
  })
);
