import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getMe,
  login as apiLogin,
  logout as apiLogout,
  type AuthUser,
  type UserRole,
} from '../api/auth';
import { getAccessToken } from '../api/client';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_PORTAL: Record<UserRole, 'patient' | 'clinician' | 'lab' | 'research' | 'admin'> = {
  patient: 'patient',
  clinician: 'clinician',
  lab: 'lab',
  researcher: 'research',
  admin: 'admin',
};

// eslint-disable-next-line react-refresh/only-export-components
export function portalForRole(role: UserRole) {
  return ROLE_PORTAL[role];
}

// eslint-disable-next-line react-refresh/only-export-components
export function canAccessPortal(role: UserRole, portal: string): boolean {
  if (role === 'admin') return true;
  return ROLE_PORTAL[role] === portal;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await apiLogin(email, password);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
