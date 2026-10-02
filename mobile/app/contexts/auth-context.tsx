import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiLogout, type AuthUser } from '@/utils/auth-api';

export interface UserProfile extends AuthUser {}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: UserProfile) => Promise<void>;
  updateUser: (partial: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const AUTH_USER_KEY = '@nuyda_user_auth';
const AUTH_TOKEN_KEY = '@nuyda_auth_token';

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  updateUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const [savedUserStr, savedToken] = await Promise.all([
          AsyncStorage.getItem(AUTH_USER_KEY),
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
        ]);

        if (savedUserStr) {
          const parsed = JSON.parse(savedUserStr);
          setUser(parsed);
        }
        if (savedToken) {
          setToken(savedToken);
        }
      } catch (e) {
        console.warn('Failed to load auth from storage:', e);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredAuth();
  }, []);

  const login = async (newToken: string, newUser: UserProfile) => {
    setUser(newUser);
    setToken(newToken);
    await Promise.all([
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser)),
      AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken),
    ]);
  };

  const updateUser = async (partial: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...partial };
    setUser(updated);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
  };

  const logout = async () => {
    const currentToken = token;
    setUser(null);
    setToken(null);
    await Promise.all([
      AsyncStorage.removeItem(AUTH_USER_KEY),
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
    ]);

    if (currentToken) {
      try {
        await apiLogout(currentToken);
      } catch {}
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: Boolean(user && token),
        login,
        updateUser,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
