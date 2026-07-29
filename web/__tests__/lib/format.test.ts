import { describe, it, expect } from 'vitest';
import { formatPrice, formatDate, formatStatus, statusColor, formatRating, formatItemCount } from '@/lib/format';
import type { OrderStatus } from '@ecom/shared';

describe('lib/format', () => {
  describe('formatPrice', () => {
    it('formats cents into dollars correctly', () => {
      expect(formatPrice(29900)).toBe('$299.00');
      expect(formatPrice(0)).toBe('$0.00');
      expect(formatPrice(123456)).toBe('$1,234.56');
    });

    it('supports other currencies', () => {
      // Intl format can vary by Node version/locale, but we just want to ensure it passes the currency option
      const gbp = formatPrice(1000, 'GBP');
      expect(gbp).toContain('10.00');
      expect(gbp).not.toContain('$');
    });
  });

  describe('formatDate', () => {
    it('formats ISO strings to short dates', () => {
      const formatted = formatDate('2026-06-02T09:00:00.000Z');
      expect(formatted).toMatch(/Jun 2, 2026/i);
    });
  });

  describe('formatStatus & statusColor', () => {
    it('returns correct labels for statuses', () => {
      expect(formatStatus('pending')).toBe('Pending');
      expect(formatStatus('shipped')).toBe('Shipped');
    });

    it('falls back to the raw string if unknown', () => {
      expect(formatStatus('unknown_status' as OrderStatus)).toBe('unknown_status');
    });

    it('returns a tailwind class string for valid statuses', () => {
      expect(statusColor('delivered')).toContain('bg-green-100');
      expect(statusColor('cancelled')).toContain('bg-red-100');
    });

    it('returns empty string for unknown status colors', () => {
      expect(statusColor('unknown' as OrderStatus)).toBe('');
    });
  });

  describe('formatRating', () => {
    it('formats to 1 decimal place', () => {
      expect(formatRating(4)).toBe('4.0');
      expect(formatRating(4.56)).toBe('4.6');
    });

    it('clamps between 0 and 5', () => {
      expect(formatRating(6)).toBe('5.0');
      expect(formatRating(-1)).toBe('0.0');
    });
  });

  describe('formatItemCount', () => {
    it('pluralizes correctly', () => {
      expect(formatItemCount(0)).toBe('0 items');
      expect(formatItemCount(1)).toBe('1 item');
      expect(formatItemCount(2)).toBe('2 items');
    });
  });
});
