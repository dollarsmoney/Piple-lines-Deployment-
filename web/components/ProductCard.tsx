'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import type { Product } from '@ecom/shared';
import { formatPrice } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/StarRating';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addItem } = useCart();
  const { token } = useAuth();
  const [adding, setAdding] = useState(false);

  const hasDiscount = product.compareAtPrice !== null && product.compareAtPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
    : 0;

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!token) {
      toast.error('Sign in to add items to your cart');
      return;
    }
    setAdding(true);
    try {
      await addItem(product.id);
      toast.success(`${product.title} added to cart`);
    } catch {
      toast.error('Failed to add item — please try again');
    } finally {
      setAdding(false);
    }
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm lift',
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={product.image}
          alt={product.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Badge variant="secondary" className="text-sm font-semibold">
              Out of stock
            </Badge>
          </div>
        )}
        {hasDiscount && product.stock > 0 && (
          <Badge className="absolute top-2 left-2 bg-primary text-xs font-bold">
            -{discountPct}%
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {product.brand}
        </p>
        <h3 className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-foreground">
          {product.title}
        </h3>

        <StarRating rating={product.rating} reviewCount={product.reviewCount} />

        {/* Price row */}
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-foreground">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(product.compareAtPrice!)}
            </span>
          )}
        </div>

        <Button
          id={`add-to-cart-${product.id}`}
          size="sm"
          className="mt-1 w-full gap-1.5"
          disabled={product.stock === 0 || adding}
          onClick={handleAdd}
        >
          <ShoppingCart className="size-3.5" />
          {adding ? 'Adding…' : 'Add to cart'}
        </Button>
      </div>
    </Link>
  );
}
