import React, { createContext, useContext, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { login as apiLogin, register as apiRegister } from '../api';

export type AuthUser = {
  id?: string | number;
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
};

export type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, phone: string, password: string) => Promise<void>;
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async (identifier: string, password: string) => {
    setLoading(true);
    try {
      const { token: newToken, user: apiUser } = await apiLogin({ identifier, password });
      setToken(newToken);
      setUser(apiUser ?? null);
    } catch (error: any) {
      Alert.alert('Login failed', error?.message ?? 'Unknown error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, phone: string, password: string) => {
    setLoading(true);
    try {
      const { token: newToken, user: apiUser } = await apiRegister({
        name,
        email,
        phone,
        password,
      });
      setToken(newToken);
      setUser(apiUser ?? null);
    } catch (error: any) {
      Alert.alert('Registration failed', error?.message ?? 'Unknown error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [token, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
