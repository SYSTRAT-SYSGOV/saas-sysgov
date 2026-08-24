export type TenantContext = { slug: string; name: string; settings: Record<string, unknown> };
export type Paginated<T> = { data: T[]; current_page: number; last_page: number; total: number };

export interface TenantSettings {
  customPrimaryColor?: string;
  customLogoUrl?: string;
  title?: string;
  subtitle?: string;
  hideProviderBranding?: boolean;
  [key: string]: unknown;
}

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  type: 'prefeitura' | 'camara' | 'autarquia' | string;
  settings?: TenantSettings;
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
  roles?: string[];
}

export interface MenuItem {
  id: number | string;
  label: string;
  icon: string;
  route: string;
  shortcut?: string | null;
  badge?: number | string | null;
  module?: string;
  permission?: string;
}

export interface MenuGroup {
  id: number | string;
  name: string;
  icon?: string | null;
  items: MenuItem[];
}

export interface LoginResponse {
  token: string;
  user?: User;
  tenant: Tenant;
  tenants: Tenant[];
  modules: string[];
  permissions: string[];
  navigation: MenuGroup[];
}

export { SysgovApi, sysgovApi } from './client';
export type {
  ApiUser,
  ApiTenant,
  CreateTenantInput,
  UpdateTenantInput,
  CreateUserInput,
  ApiRole,
  ApiPermission,
  FinanceSummary,
  MonitoringSummary,
  OrganizationNode,
  HierarchyNodeInput,
  ApiContract,
  CreateContractInput,
  UpdateContractInput,
  ApiModule,
} from './client';
