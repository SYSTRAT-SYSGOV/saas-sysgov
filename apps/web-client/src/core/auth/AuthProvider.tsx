import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LoginResponse, Tenant, User, MenuGroup } from '@/types/navigation';
import { apiClient } from '@/core/api/client';

interface AuthContextType {
  token: string | null;
  user: User | null;
  tenant: Tenant | null;
  tenants: Tenant[];
  modules: string[];
  permissions: string[];
  navigation: MenuGroup[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password?: string; tenantSlug?: string }) => Promise<LoginResponse>;
  loginWithSSO: () => void;
  logout: () => void;
  switchTenant: (tenantId: number) => Promise<void>;
  updateSession: (data: Partial<LoginResponse>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'sysgov_auth_state';
const TOKEN_KEY = 'sysgov_auth_token';
const TENANT_ID_KEY = 'sysgov_active_tenant_id';
const DEMO_TOKEN_FRAGMENT = 'abc123demo-sysgov-2026';

// Default mock data conforming exactly to the backend login contract
const DEMO_RESPONSE: LoginResponse = {
  token: '1|abc123demo-sysgov-2026',
  user: {
    id: 1,
    name: 'Carlos Eduardo Silveira',
    email: 'carlos.silveira@araucaria.pr.gov.br',
    roles: ['Secretário de Finanças', 'Gestor de Contratos'],
  },
  tenant: {
    id: 1,
    name: 'Prefeitura de Araucária',
    slug: 'araucaria',
    type: 'prefeitura',
    settings: {
      customPrimaryColor: '#1351b4',
      customLogoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=128&auto=format&fit=crop&q=80',
      title: 'Portal de Gestão',
      subtitle: 'Prefeitura de Araucária',
      hideProviderBranding: false,
    },
  },
  tenants: [
    {
      id: 1,
      name: 'Prefeitura de Araucária',
      slug: 'araucaria',
      type: 'prefeitura',
      settings: {
        customPrimaryColor: '#1351b4',
        title: 'Portal de Gestão',
        subtitle: 'Prefeitura de Araucária',
        hideProviderBranding: false,
      },
    },
    {
      id: 2,
      name: 'Câmara de Araucária',
      slug: 'camara-araucaria',
      type: 'camara',
      settings: {
        customPrimaryColor: '#0c326f',
        title: 'Portal Legislativo',
        subtitle: 'Câmara de Araucária',
        hideProviderBranding: true,
      },
    },
    {
      id: 3,
      name: 'Prefeitura de São José dos Pinhais',
      slug: 'sjp',
      type: 'prefeitura',
      settings: {
        customPrimaryColor: '#1351b4',
        title: 'Gestão Inteligente SJP',
        subtitle: 'Prefeitura de São José dos Pinhais',
        hideProviderBranding: false,
      },
    },
  ],
  modules: ['dashboard', 'org', 'procurement', 'contracts', 'finance', 'pedagogico', 'rh', 'cemiterios', 'users'],
  permissions: [
    'dashboard.view',
    'org.view',
    'org.create',
    'org.update',
    'org.delete',
    'org.move',
    'org.user.link',
    'procurement.view',
    'procurement.create',
    'contracts.view',
    'contracts.create',
    'finance.view',
    'pedagogico.view',
    'rh.view',
    'cemiterios.view',
    'users.manage',
  ],
  navigation: [
    {
      id: 1,
      name: 'GESTÃO FISCAL & ORÇAMENTÁRIA',
      icon: 'PieChart',
      items: [
        { id: 'nav-dash', label: 'Painel Geral', icon: 'LayoutDashboard', route: '/', shortcut: 'D', badge: null, module: 'dashboard', permission: 'dashboard.view' },
        { id: 'nav-lic', label: 'Licitações', icon: 'FileText', route: '/licitacoes', shortcut: 'L', badge: null, module: 'procurement', permission: 'procurement.view' },
        { id: 'nav-con', label: 'Contratos', icon: 'FileSignature', route: '/contratos', shortcut: 'C', badge: 2, module: 'contracts', permission: 'contracts.view' },
        { id: 'nav-fin', label: 'Execução Financeira', icon: 'Coins', route: '/financeiro', shortcut: 'F', badge: null, module: 'finance', permission: 'finance.view' },
      ],
    },
    {
      id: 2,
      name: 'GESTÃO SETORIAL',
      icon: 'Building2',
      items: [
        { id: 'nav-org', label: 'Organograma Municipal', icon: 'Network', route: '/organograma', shortcut: 'O', badge: null, module: 'org', permission: 'org.view' },
        { id: 'nav-usr', label: 'Usuários & Acessos', icon: 'Users', route: '/usuarios', shortcut: 'U', badge: null, module: 'users', permission: 'users.manage' },
        { id: 'nav-ped', label: 'Módulo Pedagógico', icon: 'GraduationCap', route: '/pedagogico', shortcut: 'E', badge: null, module: 'pedagogico', permission: 'pedagogico.view' },
        { id: 'nav-rh', label: 'Recursos Humanos / Folha', icon: 'Users', route: '/rh', shortcut: 'R', badge: null, module: 'rh', permission: 'rh.view' },
        { id: 'nav-cem', label: 'Gestão de Cemitérios', icon: 'Cross', route: '/cemiterios', shortcut: 'G', badge: null, module: 'cemiterios', permission: 'cemiterios.view' },
      ],
    },
  ],
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [navigation, setNavigation] = useState<MenuGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load initial state from LocalStorage
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedState = localStorage.getItem(STORAGE_KEY);

    if (storedToken && storedState) {
      // Sessão de demonstração antiga (backend ficou fora do ar em algum momento).
      // Com o backend no ar, o token demo é inválido (401) — descarta e vai para o login.
      if (storedToken.includes(DEMO_TOKEN_FRAGMENT)) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TENANT_ID_KEY);
        window.location.href = '/login';
        return;
      }

      try {
        const parsed: LoginResponse = JSON.parse(storedState);
        setToken(parsed.token || storedToken);
        setUser(parsed.user || null);
        setTenant(parsed.tenant || null);
        setTenants(parsed.tenants || []);
        setModules(parsed.modules || []);
        setPermissions(parsed.permissions || []);
        setNavigation(parsed.navigation || []);
      } catch (e) {
        console.error('Erro ao carregar sessão do storage:', e);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(STORAGE_KEY);
        setIsLoading(false);
        return;
      }

      // Backend no ar: valida o token armazenado. Se ele foi invalidado
      // (ex.: migrate:fresh --seed apagou os personal_access_tokens), redireciona
      // para /login e limpa a sessão em vez de deixar o usuário preso com um token morto.
      apiClient
        .get('/auth/me', { timeout: 4000 })
        .then(() => setIsLoading(false))
        .catch((err: any) => {
          if (err.response?.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(TENANT_ID_KEY);
            window.location.href = '/login';
          } else {
            setIsLoading(false);
          }
        });
      return;
    }

    // Sem sessão armazenada: só entra em modo demonstração quando o backend
    // estiver inacessível. Com o backend no ar, o usuário vai para o login —
    // evita o bounce infinito causado pelo token de demonstração (401 → /login).
    apiClient
      .get('/health', { timeout: 4000 })
      .then(() => setIsLoading(false))
      .catch(() => {
        saveSession(DEMO_RESPONSE);
        setIsLoading(false);
      });
  }, []);

  const saveSession = (data: LoginResponse) => {
    setToken(data.token);
    setUser(data.user || null);
    setTenant(data.tenant);
    setTenants(data.tenants || [data.tenant]);
    setModules(data.modules || []);
    setPermissions(data.permissions || []);
    setNavigation(data.navigation || []);

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (data.tenant?.id) {
      localStorage.setItem(TENANT_ID_KEY, String(data.tenant.id));
    }
  };

  const login = async (credentials: { email: string; password?: string; tenantSlug?: string }): Promise<LoginResponse> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
      const data = response.data;
      saveSession(data);
      return data;
    } catch (error: any) {
      // Erro HTTP (ex.: 401 credenciais inválidas, 422 validação): não cai em demo
      if (error.response) {
        throw error;
      }
      // Erro de rede (backend inacessível): fallback para demonstração
      console.warn('Backend endpoint indisponível, aplicando fallback local:', error);
      const selectedTenant = DEMO_RESPONSE.tenants.find(t => t.slug === credentials.tenantSlug) || DEMO_RESPONSE.tenant;
      const customResponse: LoginResponse = {
        ...DEMO_RESPONSE,
        user: {
          ...DEMO_RESPONSE.user!,
          email: credentials.email,
        },
        tenant: selectedTenant,
      };
      saveSession(customResponse);
      return customResponse;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithSSO = () => {
    window.location.href = `${apiClient.defaults.baseURL}/auth/sso/redirect`;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TENANT_ID_KEY);
    setToken(null);
    setUser(null);
    setTenant(null);
    setTenants([]);
    setModules([]);
    setPermissions([]);
    setNavigation([]);
    window.location.href = '/login';
  };

  const switchTenant = async (tenantId: number): Promise<void> => {
    const targetTenant = tenants.find(t => t.id === tenantId);
    if (!targetTenant) return;

    try {
      const response = await apiClient.post<LoginResponse>('/auth/switch-tenant', { tenant_id: tenantId });
      saveSession(response.data);
    } catch {
      const updatedTenant = { ...targetTenant };
      const updatedState: LoginResponse = {
        token: token || 'demo-token',
        user: user || undefined,
        tenant: updatedTenant,
        tenants,
        modules,
        permissions,
        navigation,
      };
      saveSession(updatedState);
    }
  };

  const updateSession = (data: Partial<LoginResponse>) => {
    if (!tenant) return;
    const newState: LoginResponse = {
      token: data.token ?? token ?? '',
      user: data.user ?? user ?? undefined,
      tenant: data.tenant ?? tenant,
      tenants: data.tenants ?? tenants,
      modules: data.modules ?? modules,
      permissions: data.permissions ?? permissions,
      navigation: data.navigation ?? navigation,
    };
    saveSession(newState);
  };

  const value: AuthContextType = {
    token,
    user,
    tenant,
    tenants,
    modules,
    permissions,
    navigation,
    isAuthenticated: !!token && !!tenant,
    isLoading,
    login,
    loginWithSSO,
    logout,
    switchTenant,
    updateSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
