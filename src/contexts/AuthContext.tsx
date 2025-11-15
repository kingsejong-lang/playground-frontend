'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, AuthResponse, User } from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Try to get user info using httpOnly cookie
      const result = await authAPI.getMe();
      if (result.ok) {
        setUser(result.value);
      }
    } catch (error) {
      console.error('Failed to check auth:', error);
      // Cookie might be expired or invalid
      // No need to manually clear - backend handles cookie expiration
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthResponse = (response: AuthResponse) => {
    // Tokens are now set as httpOnly cookies by the backend
    // We only need to update the user state
    setUser(response.user);
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await authAPI.login({ email, password });
      if (result.ok) {
        handleAuthResponse(result.value);
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const result = await authAPI.register({ email, password, name });
      if (result.ok) {
        handleAuthResponse(result.value);
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    // Cookies are cleared by the backend on logout endpoint call
    // For now, just clear the user state
    // TODO: Call backend logout endpoint to clear httpOnly cookies
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('useAuth must be used within an AuthProvider');
    // Return a fallback context to prevent runtime errors
    // In development, this will be logged and visible
    return {
      user: null,
      isAuthenticated: false,
      loading: false,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
    };
  }
  return context;
}
