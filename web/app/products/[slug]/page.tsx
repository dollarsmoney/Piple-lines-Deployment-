'use client';

import { use } from 'react';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useProduct } from '@/hooks/useProduct';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StarRating } from '@/components/StarRating';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';

export default function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const params = use(props.params);
  const { product, related, isLoading, error } = useProduct(params.slug);
  const { addItem } = useCart();
  const { token } = useAuth();

  if (error) {
    return (
      <div className="container-page flex flex-col items-center justify-center py-32 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <p className="mt-2 text-muted-foreground">This item may have been removed or doesn't exist.</p>
      </div>
    );
  }

  const hasDiscount =
    product?.compareAtPrice !== null && product?.compareAtPrice! > product?.price!;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
    : 0;

  return (
    <div className="container-page py-10">
      {/* PDP Header */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Image col */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted border">
          {isLoading ? (
            <Skeleton className="size-full" />
          ) : (
            product && (
              <Image
                src={product.image}
                alt={product.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            )
          )}
        </div>

        {/* Info col */}
        <div className="flex flex-col py-4">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="mt-4 h-12 w-full max-w-sm rounded-md" />
              <div className="mt-8 flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ) : (
            product && (
              <>
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {product.brand}
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  {product.title}
                </h1>
                
                <div className="mt-4 flex items-center gap-4">
                  <StarRating rating={product.rating} reviewCount={product.reviewCount} />
                  <Badge variant="outline" className="text-xs">
                    {product.category}
                  </Badge>
                </div>

                <div className="mt-6 flex items-end gap-3">
                  <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
                  {hasDiscount && (
                    <span className="mb-1 text-lg text-muted-foreground line-through">
                      {formatPrice(product.compareAtPrice!)}
                    </span>
                  )}
                  {hasDiscount && (
                    <Badge className="mb-1 ml-2 bg-primary">{discountPct}% OFF</Badge>
                  )}
                </div>

                <div className="mt-8">
                  {product.stock === 0 ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive">
                      <p className="font-medium">Out of stock</p>
                      <p className="text-sm opacity-80">This item is currently unavailable.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-success">
                        In stock ({product.stock} available)
                      </p>
                      <Button
                        id="pdp-add-to-cart"
                        size="lg"
                        className="w-full max-w-sm gap-2"
                        onClick={async () => {
                          if (!token) {
                            toast.error('Sign in to add items to your cart');
                            return;
                          }
                          try {
                            await addItem(product.id);
                            toast.success('Added to cart');
                          } catch {
                            toast.error('Failed to add item');
                          }
                        }}
                      >
                        <ShoppingCart className="size-5" />
                        Add to cart
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-10">
                  <h2 className="text-lg font-semibold">Description</h2>
                  <p className="mt-4 leading-relaxed text-muted-foreground">
                    {product.description}
                  </p>
                </div>

                {product.tags.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-2">
                    {product.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="bg-muted">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>

      {/* Related Products */}
      <div className="mt-24">
        <h2 className="text-2xl font-bold tracking-tight">You might also like</h2>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)
            : related.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
}
