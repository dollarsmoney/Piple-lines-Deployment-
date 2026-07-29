'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, CreditCard, Package } from 'lucide-react';
import type { Order } from '@ecom/shared';
import { api } from '@/lib/api';
import { formatDate, formatPrice, formatStatus, statusColor } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function OrderDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      router.push('/');
      return;
    }

    api
      .get<Order>(`/api/orders/${params.id}`)
      .then((data) => setOrder(data))
      .catch((err) => setError(err instanceof Error ? err : new Error('Failed to load order')))
      .finally(() => setIsLoading(false));
  }, [token, authLoading, router, params.id]);

  if (authLoading || isLoading) {
    return (
      <div className="container-page py-20 text-center text-muted-foreground">
        Loading order details…
      </div>
    );
  }

  if (!token) return null; // Redirecting

  if (error || !order) {
    return (
      <div className="container-page py-32 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-muted-foreground">
          This order may not exist or you don't have access to it.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-5xl">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-3 mb-4 text-muted-foreground hover:text-foreground"
        >
          <Link href="/orders">
            <ArrowLeft className="mr-2 size-4" />
            Back to Orders
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order #{order.reference}</h1>
            <p className="text-muted-foreground mt-1">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <Badge className={statusColor(order.status)} variant="outline">
            {formatStatus(order.status)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Details */}
        <div className="flex flex-col gap-8 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="size-5" />
                Items
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {order.items.map((item) => (
                <div key={item.productId} className="flex gap-4">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-md border bg-muted">
                    <img src={item.image} alt={item.title} className="size-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <Link
                        href={`/products/${item.slug}`}
                        className="font-medium hover:underline line-clamp-2"
                      >
                        {item.title}
                      </Link>
                      <span className="font-semibold">{formatPrice(item.price)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="flex flex-col gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="size-5" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(order.totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{formatPrice(order.totals.shipping)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{formatPrice(order.totals.tax)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{formatPrice(order.totals.total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="size-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium mb-1">{order.shippingAddress.fullName}</p>
              <p className="text-muted-foreground">{order.shippingAddress.email}</p>
              <div className="mt-3 text-muted-foreground">
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
