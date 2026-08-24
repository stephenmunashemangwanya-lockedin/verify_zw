import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { User } from '../types';

type Auth = { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<User>; logout: () => Promise<void>; clearSession: () => void; refresh: () => Promise<void> };
const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { const response = await api.get('/auth/profile'); setUser(response.data.user); }
    catch { setUser(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const expired = () => setUser(null);
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, [refresh]);
  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const authenticatedUser=response.data.user as User; setUser(authenticatedUser); return authenticatedUser;
  }, []);
  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } finally { setUser(null); }
  }, []);
  const clearSession = useCallback(() => setUser(null), []);
  const value = useMemo(() => ({ user, loading, login, logout, clearSession, refresh }), [user, loading, login, logout, clearSession, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => { const context = useContext(AuthContext); if (!context) throw new Error('AuthProvider missing'); return context; };
