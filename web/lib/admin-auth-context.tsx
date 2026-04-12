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
import { adminLogin as apiAdminLogin } from '@/lib/api';

interface AdminProfile {
  id: string;
  email: string;
  role: string;
}

interface AdminAuthContextValue {
  admin: AdminProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

function decodeToken(token: string): JwtPayload {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload));
}

function isTokenExpired(payload: JwtPayload): boolean {
  if (!('exp' in payload)) return false;
  const exp = (payload as JwtPayload & { exp: number }).exp;
  return Date.now() >= exp * 1000;
}

function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem('admin_access_token', tokens.access_token);
  localStorage.setItem('admin_refresh_token', tokens.refresh_token);
}

function clearTokens(): void {
  localStorage.removeItem('admin_access_token');
  localStorage.removeItem('admin_refresh_token');
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedAccess = localStorage.getItem('admin_access_token');
      if (!storedAccess) return;

      const payload = decodeToken(storedAccess);

      if (isTokenExpired(payload)) {
        clearTokens();
      } else {
        setAdmin({
          id: payload.sub,
          email: payload.email,
          role: payload.role ?? 'super_admin',
        });
      }
    } catch {
      clearTokens();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await apiAdminLogin(email, password);
    storeTokens(tokens);
    const payload = decodeToken(tokens.access_token);
    setAdmin({
      id: payload.sub,
      email: payload.email,
      role: payload.role ?? 'super_admin',
    });
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
