export interface TenantUserRole {
  id: number;
  name: string;
  slug: string;
  scope: 'systrat' | 'tenant';
  is_system: boolean;
}

export interface TenantUser {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  mfa_enabled: boolean;
  created_at: string;
  roles?: TenantUserRole[];
  role_slug?: string;
  role_name?: string;
  status?: 'active' | 'inactive';
}

export interface PaginatedTenantUsers {
  data: TenantUser[];
  meta?: { current_page: number; last_page: number; total: number; per_page: number };
}

export interface CreateTenantUserInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role_slug: string;
}

export interface UpdateTenantUserInput {
  name?: string;
  email?: string;
  role_slug?: string;
  is_active?: boolean;
}
