import { z } from 'zod';

export const CATEGORIES = ['Audio', 'Wearables', 'Computing', 'Home', 'Accessories'] as const;

export const PRODUCT_SORTS = ['newest', 'price-asc', 'price-desc', 'rating'] as const;

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Query params arrive as strings, so everything is coerced. `limit` is capped
 * to keep a hostile `?limit=100000` from walking the whole catalogue.
 */
export const productQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.enum(CATEGORIES).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(PRODUCT_SORTS).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(20),
});

export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  line1: z.string().trim().min(3, 'Address is required').max(120),
  line2: z.string().trim().max(120).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required').max(60),
  postalCode: z.string().trim().min(3, 'Postal code is required').max(12),
  country: z.string().trim().min(2, 'Country is required').max(60),
});

export const checkoutSchema = z.object({
  shippingAddress: shippingAddressSchema,
});

export const validateProductsSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1).max(50),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;
