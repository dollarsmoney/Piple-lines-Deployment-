import { describe, expect, it } from 'vitest';
import {
  addToCartSchema,
  loginSchema,
  productQuerySchema,
  registerSchema,
  shippingAddressSchema,
} from './schemas.js';

describe('registerSchema', () => {
  it('normalises the email to lowercase and trims whitespace', () => {
    const result = registerSchema.parse({
      name: '  Ada Lovelace  ',
      email: '  ADA@Example.COM ',
      password: 'supersecret',
    });

    expect(result.email).toBe('ada@example.com');
    expect(result.name).toBe('Ada Lovelace');
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'short',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('at least 8 characters');
  });

  it('rejects a malformed email', () => {
    expect(
      registerSchema.safeParse({ name: 'Ada', email: 'not-an-email', password: 'supersecret' })
        .success
    ).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts any non-empty password so old accounts can still sign in', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });
});

describe('productQuerySchema', () => {
  it('applies defaults when the query string is empty', () => {
    expect(productQuerySchema.parse({})).toMatchObject({ sort: 'newest', page: 1, limit: 12 });
  });

  it('coerces numeric strings from the query string', () => {
    const result = productQuerySchema.parse({ page: '3', limit: '24', minPrice: '1000' });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(24);
    expect(result.minPrice).toBe(1000);
  });

  it('caps limit at 48 so a hostile query cannot dump the catalogue', () => {
    expect(productQuerySchema.safeParse({ limit: '100000' }).success).toBe(false);
  });

  it('rejects an unknown category', () => {
    expect(productQuerySchema.safeParse({ category: 'Groceries' }).success).toBe(false);
  });
});

describe('addToCartSchema', () => {
  it('defaults the quantity to 1', () => {
    expect(addToCartSchema.parse({ productId: 'p-1' }).quantity).toBe(1);
  });

  it('rejects a quantity of 0 or above 20', () => {
    expect(addToCartSchema.safeParse({ productId: 'p-1', quantity: 0 }).success).toBe(false);
    expect(addToCartSchema.safeParse({ productId: 'p-1', quantity: 21 }).success).toBe(false);
  });
});

describe('shippingAddressSchema', () => {
  it('accepts an address without the optional second line', () => {
    const result = shippingAddressSchema.safeParse({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      line1: '12 Analytical Way',
      city: 'London',
      postalCode: 'EC1A',
      country: 'United Kingdom',
    });

    expect(result.success).toBe(true);
  });

  it('requires a city', () => {
    const result = shippingAddressSchema.safeParse({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      line1: '12 Analytical Way',
      city: '',
      postalCode: 'EC1A',
      country: 'United Kingdom',
    });

    expect(result.success).toBe(false);
  });
});
