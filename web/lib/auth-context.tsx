'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { AuthTokens, JwtPayload } from '@api-types';
import { login as apiLogin, register as apiRegister, refreshToken as apiRefreshToken } from '@/lib/api';

interface AuthUser {
  sub: string;
  email: string;
  role?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeToken(token: string): JwtPayload {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload));
}

function isTokenExpired(payload: JwtPayload): boolean {
  if (!('exp' in payload)) return false;
  const exp = (payload as JwtPayload & { exp: number }).exp;
  return Date.now() >= exp * 1000;
}

function userFromPayload(payload: JwtPayload): AuthUser {
  return {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}

function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
}

function clearTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedAccess = localStorage.getItem('access_token');
        const storedRefresh = localStorage.getItem('refresh_token');

        if (!storedAccess) return;

        const payload = decodeToken(storedAccess);

        if (isTokenExpired(payload)) {
          if (storedRefresh) {
            const tokens: AuthTokens = await apiRefreshToken(storedRefresh);
            storeTokens(tokens);
            const newPayload = decodeToken(tokens.access_token);
            setUser(userFromPayload(newPayload));
            setAccessToken(tokens.access_token);
          } else {
            clearTokens();
          }
        } else {
          setUser(userFromPayload(payload));
          setAccessToken(storedAccess);
        }
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens: AuthTokens = await apiLogin(email, password);
    storeTokens(tokens);
    const payload = decodeToken(tokens.access_token);
    setUser(userFromPayload(payload));
    setAccessToken(tokens.access_token);
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const tokens: AuthTokens = await apiRegister(email, password, displayName);
    storeTokens(tokens);
    const payload = decodeToken(tokens.access_token);
    setUser(userFromPayload(payload));
    setAccessToken(tokens.access_token);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
