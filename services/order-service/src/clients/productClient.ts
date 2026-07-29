import {
  AppError,
  NotFoundError,
  ServiceUnavailableError,
  type ApiResponse,
  type Product,
} from '@ecom/shared';
import { config } from '../config.js';

async function callProductService<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.upstreamTimeoutMs);

  try {
    const res = await fetch(`${config.productServiceUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });

    // A 404 is a real answer about the catalogue, not an outage — pass it
    // through so the caller sees "no such product" rather than "try later".
    if (res.status === 404) {
      throw new NotFoundError('Product');
    }

    const payload = (await res.json()) as ApiResponse<T>;

    if (!res.ok || 'error' in payload) {
      throw new ServiceUnavailableError('product-service');
    }

    return payload.data;
  } catch (err) {
    // Anything else (DNS failure, timeout, malformed body) is an outage.
    if (err instanceof AppError) throw err;
    throw new ServiceUnavailableError('product-service');
  } finally {
    clearTimeout(timer);
  }
}

export function fetchProduct(productId: string): Promise<Product> {
  return callProductService<Product>(`/products/${encodeURIComponent(productId)}`);
}

/** Batch lookup used at checkout to re-price the cart against live data. */
export function fetchProducts(productIds: string[]): Promise<Product[]> {
  return callProductService<Product[]>('/products/validate', {
    method: 'POST',
    body: JSON.stringify({ productIds }),
  });
}
