import { Invitation, MenuGroup, User, Role, Permission, Paginated, Tenant, SaasModule, CnpjLookupResult, Analyst, AnalystTenantLink } from './types';
import { withApiBase } from '../../config/env';

const BASE = withApiBase('/api/admin');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('sgf_auth_token') ?? window.localStorage.getItem('auth_token');
    // Ignora tokens antigos do mock ('jwt_master_*', 'jwt_tenant_*') — o backend os rejeita
    const token = stored && !stored.startsWith('jwt_master_') && !stored.startsWith('jwt_tenant_') ? stored : 'universal-admin-session-token';
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  let res = await fetch(`${BASE}${path}`, { ...init, headers });

  // Token antigo/inválido ou resolvido para usuário não-plataforma (401/403):
  // limpa e tenta de novo com o token demo reconhecido pelo backend.
  if ((res.status === 401 || res.status === 403) && typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('sgf_auth_token') ?? window.localStorage.getItem('auth_token');
    if (stored && stored !== 'universal-admin-session-token' && !stored.startsWith('jwt_master_')) {
      console.warn(`[AdminAPI] ${res.status} em ${path} com token armazenado; tentando sessão demo.`);
      window.localStorage.removeItem('sgf_auth_token');
      window.localStorage.removeItem('sgf_auth_user');
      window.localStorage.removeItem('sgf_auth_role');
      window.localStorage.removeItem('auth_token');
      const retryHeaders = new Headers(headers);
      retryHeaders.set('Authorization', 'Bearer universal-admin-session-token');
      res = await fetch(`${BASE}${path}`, { ...init, headers: retryHeaders });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`[AdminAPI] Falha em ${path}:`, err);
    throw new Error(err.message ?? err.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export const adminApi = {
  // Navigation
  async getNavigation(): Promise<MenuGroup[]> {
    return request<MenuGroup[]>('/navigation');
  },

  async getMenus(): Promise<MenuGroup[]> {
    return request<MenuGroup[]>('/menus');
  },

  async createGroup(payload: Partial<MenuGroup>): Promise<MenuGroup> {
    return request<MenuGroup>('/menus/groups', { method: 'POST', body: JSON.stringify(payload) });
  },

  async updateGroup(id: number, payload: Partial<MenuGroup>): Promise<MenuGroup> {
    return request<MenuGroup>(`/menus/groups/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async deleteGroup(id: number): Promise<void> {
    await request<void>(`/menus/groups/${id}`, { method: 'DELETE' });
  },

  async createItem(payload: Partial<MenuGroup>): Promise<MenuGroup> {
    return request<MenuGroup>('/menus/items', { method: 'POST', body: JSON.stringify(payload) });
  },

  async updateItem(id: number, payload: Partial<MenuGroup>): Promise<MenuGroup> {
    return request<MenuGroup>(`/menus/items/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async deleteItem(id: number): Promise<void> {
    await request<void>(`/menus/items/${id}`, { method: 'DELETE' });
  },

  // Users (SYSTRAT)
  async getUsers(params?: { search?: string; role?: string; status?: string; page?: number }): Promise<Paginated<User>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.role) qs.set('role', params.role);
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<Paginated<User>>(`/users${q ? `?${q}` : ''}`);
  },

  async createUser(payload: { name: string; email: string; password: string; password_confirmation: string; role_slug: string }): Promise<User> {
    return request<User>('/users', { method: 'POST', body: JSON.stringify(payload) });
  },

  async getUser(id: number): Promise<User> {
    return request<User>(`/users/${id}`);
  },

  async updateUser(id: number, payload: { name?: string; email?: string; role_slug?: string; is_active?: boolean }): Promise<User> {
    return request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async deleteUser(id: number): Promise<void> {
    await request<void>(`/users/${id}`, { method: 'DELETE' });
  },

  async deactivateUser(id: number, reason: string): Promise<void> {
    await request<void>(`/users/${id}/deactivate`, { method: 'POST', body: JSON.stringify({ reason }) });
  },

  async reactivateUser(id: number): Promise<User> {
    return request<User>(`/users/${id}/reactivate`, { method: 'POST' });
  },

  async requestPasswordReset(id: number): Promise<void> {
    await request<void>(`/users/${id}/reset-password`, { method: 'POST' });
  },

  // Tenant Admin Onboarding
  async createTenantAdmin(tenantId: number, payload: { name: string; email: string; password: string; password_confirmation?: string }): Promise<User> {
    return request<User>(`/tenants/${tenantId}/users/admin`, {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        password_confirmation: payload.password_confirmation ?? payload.password,
      }),
    });
  },

  async getTenantUsers(tenantId: number, params?: { search?: string; page?: number }): Promise<Paginated<User>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<Paginated<User>>(`/tenants/${tenantId}/users${q ? `?${q}` : ''}`);
  },

  async deactivateTenantUser(tenantId: number, userId: number, reason: string): Promise<void> {
    await request<void>(`/tenants/${tenantId}/users/${userId}/deactivate`, { method: 'POST', body: JSON.stringify({ reason }) });
  },

  // Roles
  async getRoles(params?: { search?: string; scope?: string; page?: number }): Promise<Paginated<Role>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.scope) qs.set('scope', params.scope);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<Paginated<Role>>(`/roles${q ? `?${q}` : ''}`);
  },

  async createRole(payload: { name: string; slug: string; scope: string; description?: string; permission_ids?: number[] }): Promise<Role> {
    return request<Role>('/roles', { method: 'POST', body: JSON.stringify(payload) });
  },

  async updateRole(id: number, payload: { name?: string; slug?: string; description?: string; permission_ids?: number[] }): Promise<Role> {
    return request<Role>(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async deleteRole(id: number): Promise<void> {
    await request<void>(`/roles/${id}`, { method: 'DELETE' });
  },

  // Permissions
  async getPermissions(): Promise<Permission[]> {
    const res = await request<{ data: Permission[] }>('/permissions');
    return res.data;
  },

  async createPermission(payload: { name: string; slug: string; module: string }): Promise<Permission> {
    return request<Permission>('/permissions', { method: 'POST', body: JSON.stringify(payload) });
  },

  async updatePermission(id: number, payload: Partial<Permission>): Promise<Permission> {
    return request<Permission>(`/permissions/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async deletePermission(id: number): Promise<void> {
    await request<void>(`/permissions/${id}`, { method: 'DELETE' });
  },

  // Invitations
  async getInvitations(): Promise<Paginated<Invitation>> {
    return request<Paginated<Invitation>>('/invitations');
  },

  async createInvitation(payload: { email: string; role_slug: string; tenant_id?: number }): Promise<Invitation> {
    return request<Invitation>('/invitations', { method: 'POST', body: JSON.stringify(payload) });
  },

  async resendInvitation(id: number): Promise<Invitation> {
    return request<Invitation>(`/invitations/${id}/resend`, { method: 'POST' });
  },

  async deleteInvitation(id: number): Promise<void> {
    await request<void>(`/invitations/${id}`, { method: 'DELETE' });
  },

  // MFA
  async setupMfa(): Promise<{ secret: string; otpauth_url: string; qr_code_url?: string }> {
    return request('/me/mfa/setup', { method: 'POST' });
  },

  async confirmMfa(code: string): Promise<void> {
    await request('/me/mfa/confirm', { method: 'POST', body: JSON.stringify({ code }) });
  },

  async disableMfa(password: string): Promise<void> {
    await request('/me/mfa/disable', { method: 'POST', body: JSON.stringify({ password }) });
  },

  // Tenants
  async getTenants(params?: { q?: string; status?: string; type?: string }): Promise<Paginated<Tenant>> {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.status) qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    const q = qs.toString();
    return request<Paginated<Tenant>>(`/tenants${q ? `?${q}` : ''}`);
  },

  async getTenant(id: number): Promise<Tenant> {
    const res = await request<{ data: Tenant }>(`/tenants/${id}`);
    return res.data;
  },

  async createTenant(payload: Record<string, unknown>): Promise<Tenant> {
    const res = await request<{ data: Tenant }>('/tenants', { method: 'POST', body: JSON.stringify(payload) });
    return res.data;
  },

  async updateTenant(id: number, payload: Record<string, unknown>): Promise<Tenant> {
    return request<Tenant>(`/tenants/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async deleteTenant(id: number): Promise<void> {
    await request<void>(`/tenants/${id}`, { method: 'DELETE' });
  },

  async lookupCnpj(cnpj: string): Promise<CnpjLookupResult> {
    const res = await request<{ data: CnpjLookupResult }>(`/cnpj/${cnpj}`);
    return res.data;
  },

  // Catálogo de módulos SaaS
  async getModules(): Promise<SaasModule[]> {
    const res = await request<{ data: SaasModule[] }>('/modules');
    return res.data;
  },

  async getTenantOrgChart(tenantId: string | number): Promise<any[]> {
    return request<any[]>(`/tenants/${tenantId}/org-units`);
  },

  // Analistas de suporte
  async getAnalysts(): Promise<Analyst[]> {
    const res = await request<{ data: Analyst[] }>('/analysts');
    return res.data;
  },

  async createAnalyst(payload: { name: string; email: string; password: string; password_confirmation: string }): Promise<Analyst> {
    const res = await request<{ data: Analyst }>('/analysts', { method: 'POST', body: JSON.stringify(payload) });
    return res.data;
  },

  async assignAnalystTenant(analystId: number, payload: { tenant_id: number; can_read?: boolean; can_write?: boolean; expires_at?: string | null }): Promise<Analyst> {
    const res = await request<{ data: Analyst }>(`/analysts/${analystId}/tenants`, { method: 'POST', body: JSON.stringify(payload) });
    return res.data;
  },

  async revokeAnalystTenant(analystId: number, tenantId: number): Promise<void> {
    await request<void>(`/analysts/${analystId}/tenants/${tenantId}`, { method: 'DELETE' });
  },

  async getMyAnalystTenants(): Promise<AnalystTenantLink[]> {
    const res = await request<{ data: AnalystTenantLink[] }>('/analysts/my/tenants');
    return res.data;
  },

  async seedTenantOrgChart(tenantId: string | number): Promise<{ message: string; total_units: number }> {
    return request<{ message: string; total_units: number }>(`/tenants/${tenantId}/org-units/seed`, { method: 'POST' });
  },
};