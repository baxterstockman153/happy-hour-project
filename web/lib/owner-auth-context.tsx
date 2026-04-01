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
import {
  ownerLogin as apiOwnerLogin,
  ownerRegister as apiOwnerRegister,
  refreshToken as apiRefreshToken,
  type OwnerProfile,
} from '@/lib/api';

interface OwnerRegisterInput {
  email: string;
  password: string;
  business_name: string;
  contact_name: string;
  phone?: string;
}

interface OwnerAuthContextValue {
  owner: OwnerProfile | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: OwnerRegisterInput) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const OwnerAuthContext = createContext<OwnerAuthContextValue | null>(null);

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
  localStorage.setItem('owner_access_token', tokens.access_token);
  localStorage.setItem('owner_refresh_token', tokens.refresh_token);
}

function clearTokens(): void {
  localStorage.removeItem('owner_access_token');
  localStorage.removeItem('owner_refresh_token');
}

export function OwnerAuthProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedAccess = localStorage.getItem('owner_access_token');
        const storedRefresh = localStorage.getItem('owner_refresh_token');

        if (!storedAccess) return;

        const payload = decodeToken(storedAccess);

        if (isTokenExpired(payload)) {
          if (storedRefresh) {
            const tokens: AuthTokens = await apiRefreshToken(storedRefresh);
            storeTokens(tokens);
            setAccessToken(tokens.access_token);
            // We don't have the owner profile from a refresh, so we build a
            // minimal one from the JWT payload. A full profile can be fetched
            // later if needed.
            const newPayload = decodeToken(tokens.access_token);
            setOwner({
              id: newPayload.sub,
              email: newPayload.email,
              business_name: '',
              contact_name: '',
              phone: null,
              is_verified: false,
              is_suspended: false,
              created_at: '',
              updated_at: '',
            });
          } else {
            clearTokens();
          }
        } else {
          setAccessToken(storedAccess);
          // Restore minimal owner profile from JWT payload
          setOwner({
            id: payload.sub,
            email: payload.email,
            business_name: '',
            contact_name: '',
            phone: null,
            is_verified: false,
            is_suspended: false,
            created_at: '',
            updated_at: '',
          });
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
    const { tokens, owner: ownerData } = await apiOwnerLogin(email, password);
    storeTokens(tokens);
    setAccessToken(tokens.access_token);
    setOwner(ownerData);
  }, []);

  const register = useCallback(async (input: OwnerRegisterInput) => {
    const { tokens, owner: ownerData } = await apiOwnerRegister(input);
    storeTokens(tokens);
    setAccessToken(tokens.access_token);
    setOwner(ownerData);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setOwner(null);
    setAccessToken(null);
  }, []);

  return (
    <OwnerAuthContext.Provider value={{ owner, accessToken, login, register, logout, loading }}>
      {children}
    </OwnerAuthContext.Provider>
  );
}

export function useOwnerAuth(): OwnerAuthContextValue {
  const context = useContext(OwnerAuthContext);
  if (!context) {
    throw new Error('useOwnerAuth must be used within an OwnerAuthProvider');
  }
  return context;
}
