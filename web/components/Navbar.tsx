'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Moon, Package, ShoppingCart, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { AuthModal } from '@/components/AuthModal';
import { CartDrawer } from '@/components/CartDrawer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  function handleLogout() {
    logout();
    toast.success('Signed out');
    router.push('/');
  }

  const initials = user
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-foreground">
          <Package className="size-5 text-primary" />
          <span>ēcom</span>
        </Link>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <Button
            id="theme-toggle"
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Cart */}
          <CartDrawer>
            <Button
              id="cart-btn"
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Cart"
            >
              <ShoppingCart className="size-4" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Button>
          </CartDrawer>

          {/* User */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button id="user-menu-btn" variant="ghost" size="icon" aria-label="User menu">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem id="nav-orders" asChild>
                  <Link href="/orders">My Orders</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem id="nav-logout" onClick={handleLogout} variant="destructive">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <AuthModal>
              <Button id="sign-in-btn" variant="ghost" size="icon" aria-label="Sign in">
                <User className="size-4" />
              </Button>
            </AuthModal>
          )}
        </div>
      </div>
    </header>
  );
}
