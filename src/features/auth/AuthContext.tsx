'use client';

/**
 * Session state from AuthService. The gateway sets/clears HttpOnly cookies;
 * no token ever reaches JavaScript.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { create } from '@bufbuild/protobuf';
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  type User as ProtoUser,
} from '@kingsejong-lang/playground-proto';
import { assertValid, useRpc } from '@/lib/rpc';

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toUser(u: ProtoUser | undefined): User | null {
  return u ? { id: u.id, email: u.email, name: u.displayName } : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const api = useRpc();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.auth
      .getSession({})
      .then((res) => !cancelled && setUser(toUser(res.user)))
      .catch(() => {
        // Anonymous or backend unavailable: stay signed out.
      })
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api]);

  const login = useCallback(
    async (email: string, password: string) => {
      const request = create(LoginRequestSchema, { email, password });
      assertValid(LoginRequestSchema, request);
      const res = await api.auth.login(request);
      setUser(toUser(res.user));
    },
    [api]
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const request = create(RegisterRequestSchema, { email, password, displayName: name });
      assertValid(RegisterRequestSchema, request);
      const res = await api.auth.register(request);
      setUser(toUser(res.user));
    },
    [api]
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout({});
    } catch {
      // Clear local state even if the server call fails.
    } finally {
      setUser(null);
    }
  }, [api]);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const FALLBACK: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
};

export function useAuth(): AuthContextType {
  // Outside a provider (e.g. isolated component tests) behave as signed out.
  return useContext(AuthContext) ?? FALLBACK;
}
