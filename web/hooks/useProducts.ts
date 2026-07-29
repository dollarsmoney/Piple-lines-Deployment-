'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Paginated, Product } from '@ecom/shared';
import type { PRODUCT_SORTS } from '@ecom/shared';
import { api } from '@/lib/api';

export type SortOption = (typeof PRODUCT_SORTS)[number];

export interface ProductFilters {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

interface UseProductsResult {
  data: Paginated<Product> | null;
  isLoading: boolean;
  error: Error | null;
  setFilters: (filters: ProductFilters) => void;
  filters: ProductFilters;
}

function buildQuery(filters: ProductFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  return params.toString();
}

export function useProducts(initial: ProductFilters = {}): UseProductsResult {
  const [filters, setFilters] = useState<ProductFilters>({
    sort: 'newest',
    page: 1,
    limit: 12,
    ...initial,
  });
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch = useCallback(async (f: ProductFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = buildQuery(f);
      const result = await api.get<Paginated<Product>>(`/api/products${qs ? `?${qs}` : ''}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load products'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Debounce only the text search; other filter changes fire immediately
    const delay = filters.q !== undefined ? 350 : 0;
    debounceRef.current = setTimeout(() => fetch(filters), delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, fetch]);

  return { data, isLoading, error, filters, setFilters };
}
