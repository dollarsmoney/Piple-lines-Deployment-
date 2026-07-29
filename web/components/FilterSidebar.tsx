'use client';

import { useCallback } from 'react';
import { CATEGORIES, PRODUCT_SORTS } from '@ecom/shared';
import { formatPrice } from '@/lib/format';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ProductFilters, SortOption } from '@/hooks/useProducts';

const MAX_PRICE_CENTS = 200_000; // $2,000 — above the most expensive seed product

interface FilterSidebarProps {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  className?: string;
}

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  rating: 'Top Rated',
};

export function FilterSidebar({ filters, onFiltersChange, className }: FilterSidebarProps) {
  const update = useCallback(
    (patch: Partial<ProductFilters>) => onFiltersChange({ ...filters, ...patch, page: 1 }),
    [filters, onFiltersChange]
  );

  const selectedCategory = filters.category;
  const minPrice = filters.minPrice ?? 0;
  const maxPrice = filters.maxPrice ?? MAX_PRICE_CENTS;
  const sort = (filters.sort ?? 'newest') as SortOption;

  const hasActiveFilters =
    !!selectedCategory || minPrice > 0 || maxPrice < MAX_PRICE_CENTS || sort !== 'newest';

  function clearAll() {
    onFiltersChange({ sort: 'newest', page: 1, limit: filters.limit });
  }

  return (
    <aside className={cn('flex flex-col gap-6', className)}>
      {/* Sort */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sort by
        </h3>
        <Select value={sort} onValueChange={(v) => update({ sort: v as SortOption })}>
          <SelectTrigger id="sort-select" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_SORTS.map((s) => (
              <SelectItem key={s} value={s}>
                {SORT_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Categories */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Category
        </h3>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              id={`category-${cat.toLowerCase()}`}
              onClick={() => update({ category: selectedCategory === cat ? undefined : cat })}
              className={cn(
                'flex items-center rounded-md px-3 py-1.5 text-sm transition-colors text-left',
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'hover:bg-accent text-foreground'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price range */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Price range
          </h3>
          <span className="text-xs text-muted-foreground">
            {formatPrice(minPrice)} – {formatPrice(maxPrice)}
          </span>
        </div>
        <Slider
          id="price-range"
          min={0}
          max={MAX_PRICE_CENTS}
          step={1000}
          value={[minPrice, maxPrice]}
          onValueChange={([min, max]) => update({ minPrice: min, maxPrice: max })}
        />
      </div>

      {hasActiveFilters && (
        <>
          <Separator />
          <Button variant="outline" size="sm" onClick={clearAll} id="clear-filters">
            Clear all filters
          </Button>
        </>
      )}
    </aside>
  );
}
