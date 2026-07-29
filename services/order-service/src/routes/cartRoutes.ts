import { asyncHandler, param, requireUser, router, validate } from '@ecom/service-kit';
import {
  ValidationError,
  addToCartSchema,
  ok,
  updateCartItemSchema,
  type AddToCartInput,
  type UpdateCartItemInput,
} from '@ecom/shared';
import { fetchProduct } from '../clients/productClient.js';
import * as cartStore from '../store/cartStore.js';

export const cartRoutes = router();

cartRoutes.use(requireUser);

cartRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(ok(cartStore.getCart(req.userId!)));
  })
);

cartRoutes.post(
  '/items',
  validate(addToCartSchema),
  asyncHandler(async (req, res) => {
    const { productId, quantity } = req.body as AddToCartInput;

    // Look the product up rather than trusting a client-supplied price.
    const product = await fetchProduct(productId);

    if (product.stock <= 0) {
      throw new ValidationError(`${product.title} is out of stock`);
    }

    res.status(201).json(ok(cartStore.addItem(req.userId!, product, quantity)));
  })
);

cartRoutes.patch(
  '/items/:productId',
  validate(updateCartItemSchema),
  asyncHandler(async (req, res) => {
    const { quantity } = req.body as UpdateCartItemInput;

    res.json(ok(cartStore.setQuantity(req.userId!, param(req, 'productId'), quantity)));
  })
);

cartRoutes.delete(
  '/items/:productId',
  asyncHandler(async (req, res) => {
    res.json(ok(cartStore.removeItem(req.userId!, param(req, 'productId'))));
  })
);

cartRoutes.delete(
  '/',
  asyncHandler(async (req, res) => {
    res.json(ok(cartStore.clearCart(req.userId!)));
  })
);
