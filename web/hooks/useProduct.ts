'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@ecom/shared';
import { api } from '@/lib/api';

interface UseProductResult {
  product: Product | null;
  related: Product[];
  isLoading: boolean;
  error: Error | null;
}

export function useProduct(id: string): UseProductResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    Promise.all([
      api.get<Product>(`/api/products/${id}`),
      api.get<Product[]>(`/api/products/${id}/related`),
    ])
      .then(([p, r]) => {
        setProduct(p);
        setRelated(r);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load product'));
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  return { product, related, isLoading, error };
}
