export interface MenuItem {
  id: number;
  label: string;
  icon: string;
  route: string;
  permission?: string;
  shortcut?: string;
  module_alias?: string;
  order: number;
  is_active: boolean;
  menu_group_id?: number;
  badge?: { value: number; tone: 'rose' | 'amber' };
}

export interface MenuGroup {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  order: number;
  is_active: boolean;
  items: MenuItem[];
}

export interface Permission {
  id: number;
  name: string;
  slug: string;
  module: string;
}

export interface Role {
  id: number;
  tenant_id: number | null;
  name: string;
  slug: string;
  scope: 'systrat' | 'tenant';
  description?: string;
  is_system: boolean;
  permissions: Permission[];
  created_at: string;
}

export interface TenantLink {
  id: number;
  name: string;
  slug: string;
  role_id?: number | null;
  role_name?: string;
  status?: 'active' | 'inactive';
  is_primary?: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  is_systrat: boolean;
  is_active: boolean;
  is_platform_admin: boolean;
  mfa_enabled: boolean;
  mfa_confirmed_at?: string | null;
  email_verified_at?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at?: string;
  tenants: TenantLink[];
  roles?: Role[];
}

export interface Invitation {
  id: number;
  tenant_id: number | null;
  tenant?: { id: number; name: string; slug: string } | null;
  email: string;
  role_slug: string;
  role?: { id: number; name: string; slug: string; scope: string } | null;
  invited_by?: { id: number; name: string; email: string } | null;
  expires_at: string;
  accepted_at: string | null;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  links?: Record<string, unknown>;
  meta?: { current_page: number; last_page: number; total: number; per_page: number };
}

export interface SaasModule {
  id: number;
  name: string;
  alias: string;
  enabled: boolean;
  monthly_fee_cents: number;
  description?: string | null;
  pivot?: {
    enabled: boolean;
    monthly_fee_cents: number;
    trial_ends_at?: string | null;
  };
}

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  cnpj?: string | null;
  type: string;
  status: 'active' | 'suspended' | 'trial';
  domain?: string | null;
  plan: string;
  max_users: number;
  storage_limit_mb: number;
  monthly_fee_cents: number;
  setup_fee_cents: number;
  custom_domain_enabled: boolean;
  custom_domain_fee_cents: number;
  city?: string | null;
  uf?: string | null;
  cnae?: string | null;
  website?: string | null;
  contact_email?: string | null;
  settings?: Record<string, unknown> | null;
  created_at: string;
  modules?: SaasModule[];
  mrr_cents?: number;
  user_count?: number;
  users_percent?: number;
}

export interface CnpjLookupResult {
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  municipio: string | null;
  uf: string | null;
  cnae_fiscal: string | null;
  cnae_fiscal_descricao: string | null;
  telefone: string | null;
  email: string | null;
  porte: string | null;
  natureza_juridica: string | null;
}

export interface AnalystTenantLink {
  id: number;
  name: string;
  slug: string;
  cnpj?: string | null;
  city?: string | null;
  uf?: string | null;
  can_read: boolean;
  can_write: boolean;
  expires_at?: string | null;
}

export interface Analyst {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  tenants: AnalystTenantLink[];
}
