import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, name?: string, avatar?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AUTH_KEY = '@nuyda_user_auth';

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY).then((data) => {
      if (data) {
        try {
          setUser(JSON.parse(data));
        } catch (e) {}
      }
    });
  }, []);

  const login = async (email: string, name?: string, avatar?: string) => {
    const profile: UserProfile = {
      email,
      name: name || email.split('@')[0],
      avatar: avatar || undefined,
    };
    setUser(profile);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(profile));
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem(AUTH_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
