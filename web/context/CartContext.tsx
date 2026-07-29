'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Cart } from '@ecom/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface CartActions {
  addItem(productId: string, quantity?: number): Promise<void>;
  setQuantity(productId: string, quantity: number): Promise<void>;
  removeItem(productId: string): Promise<void>;
  clearCart(): Promise<void>;
  refresh(): Promise<void>;
}

interface CartState {
  cart: Cart | null;
  itemCount: number;
  isLoading: boolean;
}

const CartContext = createContext<(CartState & CartActions) | null>(null);

const EMPTY_CART: Cart = {
  userId: '',
  items: [],
  subtotal: 0,
  itemCount: 0,
  updatedAt: new Date().toISOString(),
};

export function CartProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setCart(null);
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.get<Cart>('/api/cart');
      setCart(data);
    } catch {
      setCart(EMPTY_CART);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Fetch cart whenever the auth token changes (login / logout)
  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (productId: string, quantity = 1) => {
      const updated = await api.post<Cart>('/api/cart/items', { productId, quantity });
      setCart(updated);
    },
    []
  );

  const setQuantity = useCallback(async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      const updated = await api.delete<Cart>(`/api/cart/items/${productId}`);
      setCart(updated);
    } else {
      const updated = await api.patch<Cart>(`/api/cart/items/${productId}`, { quantity });
      setCart(updated);
    }
  }, []);

  const removeItem = useCallback(async (productId: string) => {
    const updated = await api.delete<Cart>(`/api/cart/items/${productId}`);
    setCart(updated);
  }, []);

  const clearCart = useCallback(async () => {
    const updated = await api.delete<Cart>('/api/cart');
    setCart(updated);
  }, []);

  const itemCount = cart?.itemCount ?? 0;

  return (
    <CartContext.Provider
      value={{ cart, itemCount, isLoading, addItem, setQuantity, removeItem, clearCart, refresh }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartState & CartActions {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
