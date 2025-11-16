'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, AuthResponse } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
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
      const userData = await authAPI.getMe();
      setUser(userData);
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
      const response = await authAPI.login({ email, password });
      handleAuthResponse(response);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await authAPI.register({ email, password, name });
      handleAuthResponse(response);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call backend to clear httpOnly cookies
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with logout even if API call fails
    } finally {
      // Always clear user state
      setUser(null);
    }
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
