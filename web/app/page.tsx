'use client';

import { useState } from 'react';
import type { Metadata } from 'next';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import type { ProductFilters } from '@/hooks/useProducts';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';
import { FilterSidebar } from '@/components/FilterSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function HomePage() {
  const { data, isLoading, filters, setFilters } = useProducts();
  const [searchInput, setSearchInput] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setFilters({ ...filters, q: searchInput, page: 1 });
  }

  const products = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-background">
        <div className="hero-grid absolute inset-0 pointer-events-none" />
        <div className="container-page relative py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm mb-6">
            <Sparkles className="size-3 text-primary" />
            New arrivals every week
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Tech you&apos;ll <span className="text-primary">actually love</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Curated audio, wearables, computing gear and home tech — picked for quality, priced
            fairly.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="mt-8 mx-auto flex max-w-md gap-2">
            <Input
              id="hero-search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setFilters({ ...filters, q: e.target.value, page: 1 });
              }}
              placeholder="Search products…"
              className="h-11 flex-1 bg-background"
            />
            <Button id="hero-search-btn" type="submit" size="lg" className="shrink-0">
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* Catalogue */}
      <div className="container-page py-10">
        <div className="flex gap-8">
          {/* Sidebar */}
          <FilterSidebar
            filters={filters}
            onFiltersChange={setFilters}
            className="hidden w-56 shrink-0 lg:flex"
          />

          {/* Grid */}
          <div className="flex-1 min-w-0">
            {/* Result count */}
            {!isLoading && (
              <p className="mb-4 text-sm text-muted-foreground">
                {data?.total ?? 0} product{(data?.total ?? 0) !== 1 ? 's' : ''} found
              </p>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {isLoading
                ? Array.from({ length: 12 }, (_, i) => <ProductCardSkeleton key={i} />)
                : products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>

            {/* Empty state */}
            {!isLoading && products.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <p className="text-xl font-semibold">No products found</p>
                <p className="text-muted-foreground text-sm">
                  Try adjusting your filters or search terms.
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <Button
                  id="prev-page"
                  variant="outline"
                  size="icon"
                  disabled={currentPage <= 1}
                  onClick={() => setFilters({ ...filters, page: currentPage - 1 })}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  id="next-page"
                  variant="outline"
                  size="icon"
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilters({ ...filters, page: currentPage + 1 })}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
