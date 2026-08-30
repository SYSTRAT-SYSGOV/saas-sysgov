import { apiClient } from '@/core/api/client';

export type ModuleAccessRole = 'member' | 'manager' | 'admin' | 'editor' | 'viewer';

export interface ModuleAccessItem {
  module: string;
  role: ModuleAccessRole;
  all_org_units: boolean;
  org_unit_ids: number[];
  can_manage_users: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

export interface AccessUser {
  id: number;
  name: string;
  email: string;
  matricula?: string | null;
  cargo_id?: number | null;
  cargo?: string | null;
  is_active: boolean;
  created_at: string;
  accesses: ModuleAccessItem[];
  primary_org_unit_id?: number | null;
  group_ids?: number[];
  groups?: { id: number; name: string; category_id: number | null; category: string | null }[];
}

export interface UserFilters {
  q?: string;
  module?: string;
  org_unit_id?: number;
  group_id?: number;
  category_id?: number;
  cargo_id?: number;
}

export interface Cargo {
  id: number;
  tenant_id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface AccessCategory {
  id: number;
  tenant_id: number;
  name: string;
  description: string | null;
  groups_count?: number;
}

export interface AccessGroupAccess {
  id?: number;
  module_alias: string;
  role: string;
  org_unit_ids: number[] | null;
  can_manage_users: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  valid_to: string | null;
}

export interface AccessGroup {
  id: number;
  tenant_id: number;
  category_id: number | null;
  category?: { id: number; name: string } | null;
  name: string;
  description: string | null;
  is_active: boolean;
  users_count?: number;
  users?: { id: number; name: string; email: string }[];
  accesses: AccessGroupAccess[];
}

export interface TenantRole {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  permissions: { id: number; name: string; slug: string; module: string }[];
  created_at?: string | null;
}

export interface TenantPermission {
  id: number;
  name: string;
  slug: string;
  module: string | null;
}

export interface AccessModule {
  id: number;
  alias: string;
  name: string;
}

export interface AccessSummary {
  is_global_admin: boolean;
  modules: ModuleAccessItem[];
  allowed_org_unit_ids: number[] | null;
}

export interface OrgUnitNode {
  id: number;
  name: string;
  code: string;
  type: string;
  level: number;
  path: string;
  children?: OrgUnitNode[];
}

export interface CreateAccessUserInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  matricula?: string | null;
  cargo_id?: number | null;
  group_ids?: number[];
  primary_org_unit_id?: number | null;
  accesses: ModuleAccessItem[];
}

export type AccessStatus = 'active' | 'expired' | 'revoked';

export interface AccessMatrixRow {
  id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  module: string;
  role: string;
  all_org_units: boolean;
  org_unit_ids: number[];
  can_manage_users: boolean;
  status: AccessStatus;
  valid_from: string | null;
  valid_to: string | null;
  expiring: boolean;
  granted_by: string | null;
}

export interface AccessModuleGroup {
  module: string;
  users: {
    user_id: number;
    user_name: string | null;
    role: string;
    all_org_units: boolean;
    can_manage_users: boolean;
    status: AccessStatus;
    valid_to: string | null;
  }[];
}

export interface ExpiringAccess {
  id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  module: string;
  role: string;
  valid_to: string;
  days_left: number;
}

export interface GrantAccessInput {
  user_id: number;
  module_alias: string;
  role?: string;
  org_unit_ids?: number[];
  can_manage_users?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  valid_to?: string;
}

export interface AccessDashboardData {
  summary: AccessSummary;
  modules: AccessModule[];
  users: AccessUser[];
  org_units: OrgUnitNode[];
}

export const accessApi = {
  async dashboard(): Promise<AccessDashboardData> {
    const { data } = await apiClient.get<{ data: AccessDashboardData }>('/access/dashboard');
    return data.data;
  },

  async summary(): Promise<AccessSummary> {
    const { data } = await apiClient.get<{ data: AccessSummary }>('/access');
    return data.data;
  },

  async modules(): Promise<AccessModule[]> {
    const { data } = await apiClient.get<{ data: AccessModule[] }>('/access/modules');
    return data.data;
  },

  async users(filters?: UserFilters & { page?: number; per_page?: number }): Promise<{ items: AccessUser[]; meta: { current_page: number; per_page: number; total: number; last_page: number } }> {
    const params = new URLSearchParams();
    if (filters?.q) params.set('q', filters.q);
    if (filters?.module) params.set('module', filters.module);
    if (filters?.org_unit_id) params.set('org_unit_id', String(filters.org_unit_id));
    if (filters?.group_id) params.set('group_id', String(filters.group_id));
    if (filters?.category_id) params.set('category_id', String(filters.category_id));
    if (filters?.cargo_id) params.set('cargo_id', String(filters.cargo_id));
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.per_page) params.set('per_page', String(filters.per_page));
    const qs = params.toString();
    const { data } = await apiClient.get<{ data: AccessUser[]; meta?: { current_page: number; per_page: number; total: number; last_page: number } }>(`/access/users${qs ? `?${qs}` : ''}`);
    return {
      items: Array.isArray(data.data) ? data.data : [],
      meta: data.meta ?? { current_page: 1, per_page: 25, total: Array.isArray(data.data) ? data.data.length : 0, last_page: 1 },
    };
  },

  async resetPassword(userId: number, password: string, password_confirmation: string): Promise<void> {
    await apiClient.put(`/access/users/${userId}/reset-password`, { password, password_confirmation });
  },

  async createUser(input: CreateAccessUserInput): Promise<AccessUser> {
    const { data } = await apiClient.post<{ data: AccessUser }>('/access/users', input);
    return data.data;
  },

  async updateUser(id: number, input: { name?: string; email?: string; matricula?: string | null; cargo_id?: number | null; group_ids?: number[]; primary_org_unit_id?: number | null; accesses?: ModuleAccessItem[] }): Promise<AccessUser> {
    const { data } = await apiClient.put<{ data: AccessUser }>(`/access/users/${id}`, input);
    return data.data;
  },

  async orgUnits(): Promise<OrgUnitNode[]> {
    const { data } = await apiClient.get<{ data: OrgUnitNode[] }>('/org-units');
    return data.data ?? [];
  },

  async seedOrgUnits(): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/org-units/seed');
    return data;
  },

  // ==== Evolução Usuários & Acessos (Fase D/E) ====

  async matrix(): Promise<AccessMatrixRow[]> {
    const { data } = await apiClient.get<{ data: AccessMatrixRow[] }>('/access/matrix');
    return data.data;
  },

  async byModule(): Promise<AccessModuleGroup[]> {
    const { data } = await apiClient.get<{ data: AccessModuleGroup[] }>('/access/by-module');
    return data.data;
  },

  async expiring(): Promise<ExpiringAccess[]> {
    const { data } = await apiClient.get<{ data: ExpiringAccess[] }>('/access/expiring');
    return data.data;
  },

  async grantAccess(input: GrantAccessInput): Promise<AccessMatrixRow> {
    const { data } = await apiClient.post<{ data: AccessMatrixRow }>('/access', input);
    return data.data;
  },

  async revokeAccess(id: number, reason?: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(`/access/${id}/revoke`, { reason });
    return data;
  },

  async renewAccess(id: number, validTo?: string): Promise<{ message: string; valid_to: string | null }> {
    const { data } = await apiClient.post<{ message: string; valid_to: string | null }>(`/access/${id}/renew`, { valid_to: validTo });
    return data;
  },

  // ==== Cargos ====
  async cargos(): Promise<Cargo[]> {
    const { data } = await apiClient.get<{ data: Cargo[] }>('/access/cargos');
    return data.data;
  },

  async createCargo(input: { name: string; description?: string | null }): Promise<Cargo> {
    const { data } = await apiClient.post<{ data: Cargo }>('/access/cargos', input);
    return data.data;
  },

  async updateCargo(id: number, input: { name?: string; description?: string | null; is_active?: boolean }): Promise<Cargo> {
    const { data } = await apiClient.put<{ data: Cargo }>(`/access/cargos/${id}`, input);
    return data.data;
  },

  async deleteCargo(id: number): Promise<void> {
    await apiClient.delete(`/access/cargos/${id}`);
  },

  // ==== Categorias e Grupos ====
  async categories(): Promise<AccessCategory[]> {
    const { data } = await apiClient.get<{ data: AccessCategory[] }>('/access/categories');
    return data.data;
  },

  async createCategory(input: { name: string; description?: string | null }): Promise<AccessCategory> {
    const { data } = await apiClient.post<{ data: AccessCategory }>('/access/categories', input);
    return data.data;
  },

  async updateCategory(id: number, input: { name?: string; description?: string | null }): Promise<AccessCategory> {
    const { data } = await apiClient.put<{ data: AccessCategory }>(`/access/categories/${id}`, input);
    return data.data;
  },

  async deleteCategory(id: number): Promise<void> {
    await apiClient.delete(`/access/categories/${id}`);
  },

  async groups(): Promise<AccessGroup[]> {
    const { data } = await apiClient.get<{ data: AccessGroup[] }>('/access/groups');
    return data.data;
  },

  async createGroup(input: {
    category_id?: number | null;
    name: string;
    description?: string | null;
    accesses?: AccessGroupAccess[];
  }): Promise<AccessGroup> {
    const { data } = await apiClient.post<{ data: AccessGroup }>('/access/groups', input);
    return data.data;
  },

  async updateGroup(id: number, input: Partial<{
    category_id?: number | null;
    name: string;
    description?: string | null;
    is_active?: boolean;
    accesses?: AccessGroupAccess[];
  }>): Promise<AccessGroup> {
    const { data } = await apiClient.put<{ data: AccessGroup }>(`/access/groups/${id}`, input);
    return data.data;
  },

  async deleteGroup(id: number): Promise<void> {
    await apiClient.delete(`/access/groups/${id}`);
  },

  async assignGroupUsers(id: number, userIds: number[]): Promise<{ assigned: number; users: number[] }> {
    const { data } = await apiClient.post<{ data: { assigned: number; users: number[] } }>(`/access/groups/${id}/users`, { user_ids: userIds });
    return data.data;
  },

  async removeGroupUser(id: number, userId: number): Promise<void> {
    await apiClient.delete(`/access/groups/${id}/users/${userId}`);
  },

  // ==== Roles e Permissões ====
  async tenantRoles(): Promise<TenantRole[]> {
    const { data } = await apiClient.get<{ data: TenantRole[] }>('/access/roles');
    return data.data;
  },

  async createTenantRole(input: { name: string; slug: string; description?: string | null; permission_ids?: number[] }): Promise<TenantRole> {
    const { data } = await apiClient.post<{ data: TenantRole }>('/access/roles', input);
    return data.data;
  },

  async updateTenantRole(id: number, input: { name?: string; description?: string | null; permission_ids?: number[] }): Promise<TenantRole> {
    const { data } = await apiClient.put<{ data: TenantRole }>(`/access/roles/${id}`, input);
    return data.data;
  },

  async deleteTenantRole(id: number): Promise<void> {
    await apiClient.delete(`/access/roles/${id}`);
  },

  async tenantPermissions(): Promise<TenantPermission[]> {
    const { data } = await apiClient.get<{ data: TenantPermission[] }>('/access/permissions');
    return data.data;
  },

  // ==== Senha padrão do sistema (somente admin) ====
  async getDefaultPassword(): Promise<{ set: boolean; updated_by: number | null; updated_at: string | null }> {
    const { data } = await apiClient.get<{ data: { set: boolean; updated_by: number | null; updated_at: string | null } }>('/access/security/default-password');
    return data.data;
  },

  async setDefaultPassword(password: string, password_confirmation: string): Promise<{ set: boolean; updated_by: number; updated_at: string | null }> {
    const { data } = await apiClient.put<{ data: { set: boolean; updated_by: number; updated_at: string | null } }>('/access/security/default-password', { password, password_confirmation });
    return data.data;
  },
};
