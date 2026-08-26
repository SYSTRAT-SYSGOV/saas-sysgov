import { apiClient } from '@/core/api/client';

export interface ModuleAccessItem {
  module: string;
  role: 'member' | 'manager';
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
};
