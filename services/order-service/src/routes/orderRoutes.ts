import { asyncHandler, param, requireUser, router, validate } from '@ecom/service-kit';
import {
  ValidationError,
  calculateTotals,
  checkoutSchema,
  ok,
  type CheckoutInput,
  type OrderItem,
} from '@ecom/shared';
import { fetchProducts } from '../clients/productClient.js';
import * as cartStore from '../store/cartStore.js';
import * as orderStore from '../store/orderStore.js';

export const orderRoutes = router();

orderRoutes.use(requireUser);

orderRoutes.post(
  '/',
  validate(checkoutSchema),
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { shippingAddress } = req.body as CheckoutInput;
    const cartItems = cartStore.getItems(userId);

    if (cartItems.length === 0) {
      throw new ValidationError('Your cart is empty');
    }

    // Re-price against the live catalogue: the cart holds a snapshot that may
    // be minutes or days old, and the customer pays today's price.
    const products = await fetchProducts(cartItems.map((item) => item.productId));
    const byId = new Map(products.map((product) => [product.id, product]));

    const items: OrderItem[] = [];
    const problems: string[] = [];

    for (const item of cartItems) {
      const product = byId.get(item.productId);

      if (!product) {
        problems.push(`${item.title} is no longer available`);
        continue;
      }

      if (product.stock < item.quantity) {
        problems.push(
          product.stock === 0
            ? `${product.title} is out of stock`
            : `Only ${product.stock} left of ${product.title}`
        );
        continue;
      }

      items.push({
        ...item,
        title: product.title,
        image: product.image,
        price: product.price,
        lineTotal: product.price * item.quantity,
      });
    }

    if (problems.length > 0) {
      throw new ValidationError('Some items need your attention before checkout', problems);
    }

    const order = orderStore.createOrder({
      userId,
      items,
      totals: calculateTotals(items),
      shippingAddress,
    });

    cartStore.clearCart(userId);

    res.status(201).json(ok(order));
  })
);

orderRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(ok(orderStore.listOrders(req.userId!)));
  })
);

orderRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(ok(orderStore.requireOrder(req.userId!, param(req, 'id'))));
  })
);
