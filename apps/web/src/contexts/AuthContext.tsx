import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AuthRole = 'EMPRESA_MASTER' | 'PREFEITURA_CLIENTE';

const LEGACY_DEMO_TOKEN = 'universal-admin-session-token';

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  cpf?: string;
  cargo?: string;
  role: AuthRole | string;
  tenantId?: string;
  secretariaRestrita?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  authRole: AuthRole;
  setAuthRole: (role: AuthRole) => void;
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  login: (email: string, password: string) => boolean;
  loginTenantSession: (user: AuthUser, token?: string) => void;
  loginAdminSession: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('sgf_auth_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch {}
    return null;
  });

  const [authRole, setAuthRoleState] = useState<AuthRole>(() => {
    try {
      const saved = localStorage.getItem('sgf_auth_role');
      if (saved === 'PREFEITURA_CLIENTE' || saved === 'EMPRESA_MASTER') return saved;
    } catch {}
    return 'EMPRESA_MASTER';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const savedToken = localStorage.getItem('sgf_auth_token');
      // Sessão guardada por versões antigas (token de demonstração) não vale mais.
      return !!savedToken && savedToken !== LEGACY_DEMO_TOKEN;
    } catch {
      return false;
    }
  });

  const setAuthRole = (newRole: AuthRole) => {
    setAuthRoleState(newRole);
    try {
      localStorage.setItem('sgf_auth_role', newRole);
    } catch {}
  };

  const login = (_email: string, _password: string): boolean => {
    // Login local sem backend removido: autenticação só via API (loginAdminSession/loginTenantSession).
    return false;
  };


  const loginTenantSession = (user: AuthUser, token?: string) => {
    if (!token) {
      console.error('Sessão rejeitada: token ausente do backend.');
      return;
    }
    setCurrentUser(user);
    setAuthRoleState('PREFEITURA_CLIENTE');
    setIsAuthenticated(true);
    try {
      localStorage.setItem('sgf_auth_user', JSON.stringify(user));
      localStorage.setItem('sgf_auth_role', 'PREFEITURA_CLIENTE');
      localStorage.setItem('sgf_auth_token', token);
    } catch {}
  };

  const loginAdminSession = (user: AuthUser, token: string) => {
    const validToken = token;
    setCurrentUser(user);
    setAuthRoleState('EMPRESA_MASTER');
    setIsAuthenticated(true);
    try {
      localStorage.setItem('sgf_auth_user', JSON.stringify(user));
      localStorage.setItem('sgf_auth_role', 'EMPRESA_MASTER');
      localStorage.setItem('sgf_auth_token', validToken);
    } catch {}
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('sgf_auth_user');
      localStorage.removeItem('sgf_auth_role');
      localStorage.removeItem('sgf_auth_token');
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        authRole,
        setAuthRole,
        currentUser,
        setCurrentUser,
        login,
        loginTenantSession,
        loginAdminSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext deve ser usado dentro de um AuthProvider');
  return ctx;
};

