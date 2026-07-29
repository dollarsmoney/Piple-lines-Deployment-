import type { ApiFailure, ApiSuccess, Paginated } from './types.js';

export function ok<T>(data: T): ApiSuccess<T> {
  return { data };
}

export function fail(code: string, message: string, details?: unknown): ApiFailure {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

export function paginate<T>(items: T[], page: number, limit: number): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;

  return {
    items: items.slice(start, start + limit),
    page: safePage,
    limit,
    total,
    totalPages,
  };
}

/** Cents -> "$1,299.00". Kept here so the services and the web app agree. */
export function formatMoney(cents: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
