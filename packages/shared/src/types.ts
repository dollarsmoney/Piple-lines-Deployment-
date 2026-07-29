export type Role = 'customer' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

/** What auth-service stores internally — never leaves the service. */
export interface UserRecord extends User {
  passwordHash: string;
}

export interface JwtClaims {
  sub: string;
  email: string;
  name: string;
  role: Role;
}

export type Category = 'Audio' | 'Wearables' | 'Computing' | 'Home' | 'Accessories';

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Minor units (cents) so money math never touches floats. */
  price: number;
  compareAtPrice: number | null;
  currency: 'USD';
  category: Category;
  brand: string;
  rating: number;
  reviewCount: number;
  stock: number;
  tags: string[];
  image: string;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  title: string;
  slug: string;
  image: string;
  /** Snapshot of the price when the item was added. */
  price: number;
  quantity: number;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface ShippingAddress {
  fullName: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OrderItem extends CartItem {
  lineTotal: number;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface Order {
  id: string;
  reference: string;
  userId: string;
  items: OrderItem[];
  totals: OrderTotals;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Every service replies with exactly one of these two shapes. */
export interface ApiSuccess<T> {
  data: T;
}

export interface ApiFailure {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface AuthPayload {
  token: string;
  user: User;
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  service: string;
  uptime: number;
  dependencies?: Record<string, 'ok' | 'unreachable'>;
}
