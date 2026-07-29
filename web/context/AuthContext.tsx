'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AuthPayload, User } from '@ecom/shared';
import { api, ApiError } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthActions {
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

const TOKEN_KEY = 'token';

function persistToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    setToken(stored);
    api
      .get<User>('/api/auth/me')
      .then((u) => setUser(u))
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  const applyAuth = useCallback((payload: AuthPayload) => {
    persistToken(payload.token);
    setToken(payload.token);
    setUser(payload.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const payload = await api.post<AuthPayload>(
        '/api/auth/login',
        { email, password },
        { skipAuth: true }
      );
      applyAuth(payload);
    },
    [applyAuth]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const payload = await api.post<AuthPayload>(
        '/api/auth/register',
        { name, email, password },
        { skipAuth: true }
      );
      applyAuth(payload);
    },
    [applyAuth]
  );

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState & AuthActions {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// Re-export ApiError so callers can catch it without importing from lib/api directly
export { ApiError };
