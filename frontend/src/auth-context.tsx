import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getStoredAuthUser, setAuthSession, clearAuthSession } from './api';
import type { AuthUser, LoginResponse } from './types';

type AuthContextValue = {
  user: AuthUser | null;
  login: (accessToken: string, user: AuthUser) => void;
  handleLoginResponse: (data: LoginResponse) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser());

  const login = useCallback((accessToken: string, authUser: AuthUser) => {
    setAuthSession(accessToken, authUser);
    setUser(authUser);
  }, []);

  const handleLoginResponse = useCallback((data: LoginResponse) => {
    login(data.accessToken, data.user);
  }, [login]);

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, handleLoginResponse, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
