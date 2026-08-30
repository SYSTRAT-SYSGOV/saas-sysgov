import { apiClient } from '@/core/api/client';

export type ModuleAccessRole = 'member' | 'manager' | 'admin' | 'editor' | 'viewer';

export interface ModuleAccessItem {
  module: string;
  role: ModuleAccessRole;
  all_org_units: boolean;
  org_unit_ids: number[];
  can_manage_users: boolean;
}

export interface AccessUser {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  accesses: ModuleAccessItem[];
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

  async users(): Promise<AccessUser[]> {
    const { data } = await apiClient.get<{ data: AccessUser[] }>('/access/users');
    return data.data;
  },

  async createUser(input: CreateAccessUserInput): Promise<AccessUser> {
    const { data } = await apiClient.post<{ data: AccessUser }>('/access/users', input);
    return data.data;
  },

  async updateUser(id: number, input: { name?: string; email?: string; accesses?: ModuleAccessItem[] }): Promise<AccessUser> {
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
};
