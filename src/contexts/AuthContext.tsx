import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, register as apiRegister } from '../api';
import Toast from 'react-native-toast-message';

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
  signUp: (name: string, email: string, password: string) => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        const storedUser = await AsyncStorage.getItem('auth_user');

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to load auth date:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAuthData();
  }, []);

const signIn = async (identifier: string, password: string) => {
  setLoading(true);
  try {
    const { token: newToken, user: apiUser } = await apiLogin({ identifier, password });

    setToken(newToken);
    setUser(apiUser ?? null);

    await AsyncStorage.setItem('auth_token', newToken);
    if (apiUser) await AsyncStorage.setItem('auth_user', JSON.stringify(apiUser));

    // ✅ SUCCESS TOAST
    Toast.show({
      type: 'success',
      text1: 'Login Successful',
      text2: 'Welcome back!',
    });

  } catch (error: any) {
    console.log("FULL ERROR:", error);

    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong';

    // ❌ ERROR TOAST
    Toast.show({
      type: 'error',
      text1: 'Login Failed',
      text2: message,
    });

    console.error('Login error:', error);
  } finally {
    setLoading(false);
  }
};

const signUp = async (name: string, email: string, password: string) => {
  setLoading(true);
  try {
    const { token: newToken, user: apiUser } = await apiRegister({
      name,
      email,
      password,
    });

    setToken(newToken);
    setUser(apiUser ?? null);

    await AsyncStorage.setItem('auth_token', newToken);
    if (apiUser) await AsyncStorage.setItem('auth_user', JSON.stringify(apiUser));

    // ✅ SUCCESS TOAST
    Toast.show({
      type: 'success',
      text1: 'Registration Successful',
      text2: 'Account created successfully',
    });

  } catch (error: any) {
    console.log("FULL ERROR:", error);

    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong';

    // ❌ ERROR TOAST
    Toast.show({
      type: 'error',
      text1: 'Registration Failed',
      text2: message,
    });

    console.error('Registration error:', error);
  } finally {
    setLoading(false);
  }
};

  const signOut = async () => {
    setToken(null);
    setUser(null);
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
    } catch (e) { }
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
