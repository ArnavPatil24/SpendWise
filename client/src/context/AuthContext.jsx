import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setUnauthorizedHandler, tokenStore } from '../api/client';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(() => Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Several requests can fail together when a session expires; only the first one should react.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!tokenStore.get()) return;
      logout();
      toast.info('Your session expired. Please sign in again.');
    });
  }, [logout, toast]);

  // Restore the session on first load.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => tokenStore.clear())
      .finally(() => setBooting(false));
  }, []);

  const authenticate = useCallback(async (mode, payload) => {
    const { data } = await api.post(`/auth/${mode}`, payload);
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(() => ({
    user,
    setUser,
    booting,
    isAuthenticated: Boolean(user),
    login: payload => authenticate('login', payload),
    register: payload => authenticate('register', payload),
    logout
  }), [user, booting, authenticate, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
