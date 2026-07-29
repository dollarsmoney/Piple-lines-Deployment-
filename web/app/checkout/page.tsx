'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { checkoutSchema, type CheckoutInput } from '@ecom/shared';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function CheckoutPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { cart, itemCount, isLoading: cartLoading, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingAddress: {
        country: 'US', // Default for demo
      }
    }
  });

  if (authLoading || cartLoading) {
    return <div className="container-page py-20 text-center text-muted-foreground">Loading checkout…</div>;
  }

  if (!token) {
    return (
      <div className="container-page py-32 text-center">
        <h1 className="text-2xl font-bold">Please sign in</h1>
        <p className="mt-2 text-muted-foreground">You must be signed in to checkout.</p>
        <Button className="mt-6" onClick={() => router.push('/')}>Return Home</Button>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="container-page py-32 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add some items before checking out.</p>
        <Button className="mt-6" onClick={() => router.push('/')}>Browse Products</Button>
      </div>
    );
  }

  async function onSubmit(data: CheckoutInput) {
    setIsSubmitting(true);
    try {
      const order = await api.post<{ id: string }>('/api/orders', data);
      await clearCart(); // Invalidate local cart state since backend cleared it
      toast.success('Order placed successfully!');
      router.push(`/orders/${order.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place order');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Checkout</h1>
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main form */}
        <div className="lg:col-span-7 xl:col-span-8">
          <form id="checkout-form" onSubmit={handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" {...register('shippingAddress.fullName')} />
                    {errors.shippingAddress?.fullName && <p className="text-xs text-destructive">{errors.shippingAddress.fullName.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" {...register('shippingAddress.email')} />
                    {errors.shippingAddress?.email && <p className="text-xs text-destructive">{errors.shippingAddress.email.message}</p>}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="line1">Address Line 1</Label>
                  <Input id="line1" {...register('shippingAddress.line1')} />
                  {errors.shippingAddress?.line1 && <p className="text-xs text-destructive">{errors.shippingAddress.line1.message}</p>}
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="line2">Address Line 2 (Optional)</Label>
                  <Input id="line2" {...register('shippingAddress.line2')} />
                  {errors.shippingAddress?.line2 && <p className="text-xs text-destructive">{errors.shippingAddress.line2.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" {...register('shippingAddress.city')} />
                    {errors.shippingAddress?.city && <p className="text-xs text-destructive">{errors.shippingAddress.city.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input id="postalCode" {...register('shippingAddress.postalCode')} />
                    {errors.shippingAddress?.postalCode && <p className="text-xs text-destructive">{errors.shippingAddress.postalCode.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" {...register('shippingAddress.country')} />
                    {errors.shippingAddress?.country && <p className="text-xs text-destructive">{errors.shippingAddress.country.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Order Summary sidebar */}
        <div className="lg:col-span-5 xl:col-span-4">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {cart?.items.map((item) => (
                  <div key={item.productId} className="flex justify-between gap-4 text-sm">
                    <div className="flex-1">
                      <span className="font-medium line-clamp-1">{item.title}</span>
                      <span className="text-muted-foreground">Qty: {item.quantity}</span>
                    </div>
                    <span className="font-semibold">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}

                <Separator className="my-2" />
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(cart?.subtotal ?? 0)}</span>
                </div>
                {/* For demo, we just use the order service calculateTotals server side, but show a preview here.
                    Shipping is flat $10 unless over $50, tax 8%. To be perfectly accurate we should fetch a preview endpoint,
                    but we'll just approximate here for the UI demo. */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>Calculated at next step</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>Calculated at next step</span>
                </div>
                
                <Button 
                  type="submit" 
                  form="checkout-form"
                  size="lg" 
                  className="mt-6 w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing…' : 'Place Order'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
