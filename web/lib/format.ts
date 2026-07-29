import type { OrderStatus } from '@ecom/shared';

/**
 * Converts minor-unit cents (e.g. 29900) to a formatted dollar string ("$299.00").
 */
export function formatPrice(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Formats an ISO date string to a locale-friendly short date.
 */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function formatStatus(status: OrderStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function statusColor(status: OrderStatus): string {
  return STATUS_COLORS[status] ?? '';
}

/**
 * Clamps a number to a 0-5 range and returns it as a display string.
 */
export function formatRating(rating: number): string {
  return Math.min(5, Math.max(0, rating)).toFixed(1);
}

/**
 * Returns a human-readable item count string.
 */
export function formatItemCount(n: number): string {
  return n === 1 ? '1 item' : `${n} items`;
}
