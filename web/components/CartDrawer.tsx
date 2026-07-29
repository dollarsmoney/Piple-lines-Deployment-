'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

interface CartDrawerProps {
  children: React.ReactNode;
}

export function CartDrawer({ children }: CartDrawerProps) {
  const { cart, itemCount, setQuantity, removeItem } = useCart();
  const { token } = useAuth();

  const items = cart?.items ?? [];

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="pb-0">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5" />
            Cart
            {itemCount > 0 && (
              <Badge className="ml-1 rounded-full px-2 py-0.5 text-xs">{itemCount}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {!token ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag className="size-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Sign in to view your cart</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag className="size-12 text-muted-foreground/40" />
            <p className="text-sm font-medium">Your cart is empty</p>
            <p className="text-xs text-muted-foreground">Browse the catalogue to add items</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-6">
              <div className="flex flex-col divide-y">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-3 py-4">
                    {/* Thumbnail */}
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                      <Link
                        href={`/products/${item.slug}`}
                        className="line-clamp-2 text-sm font-medium leading-snug hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="text-sm font-semibold">{formatPrice(item.price)}</p>

                      {/* Quantity stepper */}
                      <div className="flex items-center gap-1 mt-1">
                        <Button
                          id={`qty-minus-${item.productId}`}
                          variant="outline"
                          size="icon"
                          className="size-6"
                          onClick={async () => {
                            try {
                              await setQuantity(item.productId, item.quantity - 1);
                            } catch {
                              toast.error('Failed to update quantity');
                            }
                          }}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          id={`qty-plus-${item.productId}`}
                          variant="outline"
                          size="icon"
                          className="size-6"
                          onClick={async () => {
                            try {
                              await setQuantity(item.productId, item.quantity + 1);
                            } catch {
                              toast.error('Failed to update quantity');
                            }
                          }}
                        >
                          <Plus className="size-3" />
                        </Button>

                        <button
                          id={`remove-${item.productId}`}
                          className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                          onClick={async () => {
                            try {
                              await removeItem(item.productId);
                              toast.success(`${item.title} removed`);
                            } catch {
                              toast.error('Failed to remove item');
                            }
                          }}
                          aria-label="Remove item"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t px-6 pt-4 pb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatPrice(cart?.subtotal ?? 0)}</span>
              </div>
              <Separator />
              <Button asChild id="checkout-btn" size="lg" className="w-full">
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
