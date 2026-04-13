import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import api, { setAuthToken, formatApiError } from '../api';

type User = {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  profile?: any;
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, nom: string, prenom: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => null,
  register: async () => null,
  logout: async () => {},
  refreshUser: async () => {},
});

const TOKEN_KEY = 'plombicrm_token';

async function storeToken(token: string) {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(TOKEN_KEY, token); } catch {}
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  } else {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }
}

async function removeToken() {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await getStoredToken();
      if (token) {
        setAuthToken(token);
        const { data } = await api.get('/auth/me');
        setUser(data);
      }
    } catch {
      await removeToken();
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<string | null> {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await storeToken(data.token);
      setAuthToken(data.token);
      setUser(data.user);
      return null;
    } catch (e) {
      return formatApiError(e);
    }
  }

  async function register(email: string, password: string, nom: string, prenom: string): Promise<string | null> {
    try {
      const { data } = await api.post('/auth/register', { email, password, nom, prenom });
      await storeToken(data.token);
      setAuthToken(data.token);
      setUser(data.user);
      return null;
    } catch (e) {
      return formatApiError(e);
    }
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
    await removeToken();
    setAuthToken(null);
    setUser(null);
  }

  async function refreshUser() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
