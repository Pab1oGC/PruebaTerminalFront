import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import axios from 'axios';
import { createTenantApi, setAccessToken } from '../lib/api';
import type { AxiosInstance } from 'axios';

interface User {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  tenantCode: string;
}

interface AuthContextValue {
  user: User | null;
  api: AxiosInstance;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  tenantCode: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ tenantCode, children }: { tenantCode: string; children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const api = useMemo(() => createTenantApi(tenantCode), [tenantCode]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
  }, [api]);

  useEffect(() => {
    // Try to recover session via refresh token cookie
    axios
      .post(`/api/t/${tenantCode}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        setUser(data.user);
      })
      .catch(() => { /* no session */ })
      .finally(() => setLoading(false));
  }, [tenantCode]);

  useEffect(() => {
    const handler = () => { setAccessToken(null); setUser(null); };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await axios.post(
      `/api/t/${tenantCode}/auth/login`,
      { email, password },
      { withCredentials: true }
    );
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, [tenantCode]);

  return (
    <AuthContext.Provider value={{ user, api, login, logout, loading, tenantCode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
