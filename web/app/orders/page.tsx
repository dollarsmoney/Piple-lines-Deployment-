'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package } from 'lucide-react';
import type { Order } from '@ecom/shared';
import { api } from '@/lib/api';
import { formatDate, formatPrice, formatStatus, statusColor } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrdersPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!token) {
      router.push('/');
      return;
    }

    api.get<Order[]>('/api/orders')
      .then(data => setOrders(data))
      .catch(err => setError(err instanceof Error ? err : new Error('Failed to load orders')))
      .finally(() => setIsLoading(false));
  }, [token, authLoading, router]);

  if (authLoading) {
    return <div className="container-page py-20 text-center text-muted-foreground">Loading…</div>;
  }
  
  if (!token) return null; // Redirecting

  return (
    <div className="container-page py-10 max-w-4xl">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Order History</h1>

      {isLoading ? (
        <div className="flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="bg-muted/50 py-4">
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center text-destructive">
          <p className="font-medium">Failed to load orders</p>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-24 text-center">
          <Package className="size-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-semibold">No orders yet</h2>
          <p className="mt-2 text-muted-foreground">When you place an order, it will appear here.</p>
          <Button asChild className="mt-6">
            <Link href="/">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden transition-colors hover:border-primary/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b bg-muted/30 px-6 py-4">
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <div>
                    <p className="font-medium text-foreground">Order placed</p>
                    <p className="text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Total</p>
                    <p className="text-muted-foreground">{formatPrice(order.totals.total)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Order #</p>
                    <p className="text-muted-foreground">{order.reference}</p>
                  </div>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center gap-4">
                  <Badge className={statusColor(order.status)} variant="outline">
                    {formatStatus(order.status)}
                  </Badge>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/orders/${order.id}`}>View Details</Link>
                  </Button>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {order.items.map(item => (
                    <div key={item.productId} className="flex shrink-0 items-center gap-4 border-r pr-6 last:border-0 last:pr-0">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                        <img src={item.image} alt={item.title} className="size-full object-cover" />
                      </div>
                      <div className="flex flex-col justify-center max-w-[200px]">
                        <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
