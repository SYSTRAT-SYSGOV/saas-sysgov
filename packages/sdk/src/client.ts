import type {
  CreateOrgUnitInput,
  LinkOrgUnitUserInput,
  MoveOrgUnitInput,
  OrgExportData,
  OrgScopeSummary,
  OrgUnit,
  OrgUnitTreeNode,
  OrgUnitUserLink,
  Paginated,
  TenantContext,
  UpdateOrgUnitInput,
} from './index';

export type ApiUser = { id: number; name: string; email: string; is_platform_admin: boolean };
export type ApiTenant = TenantContext & { id: number; status: 'active' | 'suspended' | 'trial'; type: string };
export type CreateTenantInput = { name: string; slug: string; cnpj?: string; type: 'prefeitura' | 'parceiro' | 'interno'; status?: 'active' | 'suspended' | 'trial'; settings?: Record<string, unknown> };
export type ApiRole = { id: number; name: string; slug: string; tenant_id: number | null; scope: 'systrat' | 'tenant'; description?: string | null; is_system: boolean; permissions: ApiPermission[] };
export type ApiPermission = { id: number; name: string; slug: string; module: string };
export type ApiTenantLink = { id: number; name: string; slug: string; role_id?: number | null; status?: 'active' | 'inactive'; is_primary?: boolean };
export type ApiUserAdmin = ApiUser & {
  avatar_url?: string | null;
  is_systrat: boolean;
  is_active: boolean;
  mfa_enabled: boolean;
  mfa_confirmed_at?: string | null;
  email_verified_at?: string | null;
  last_login_at?: string | null;
  created_at: string;
  tenants: ApiTenantLink[];
  roles?: ApiRole[];
};
export type ApiInvitation = {
  id: number;
  tenant_id: number | null;
  email: string;
  role_slug: string;
  expires_at: string;
  accepted_at: string | null;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
};
export type FinanceSummary = { tenant_id: number; revenues_cents: number; expenses_cents: number; invoices_cents: number; transfers_cents: number; pending_reconciliations: number };
export type MonitoringSummary = { generated_at: string; database: { status: string }; counts: Record<string, number>; outbox: Record<'pending' | 'processing' | 'failed', number> };
export type OrganizationNode = { id: number; name: string; code: string; departments: Array<{ id: number; name: string; code: string; management_units: Array<{ id: number; name: string; code: string; budget_units: Array<{ id: number; name: string; code: string }> }> }> };
export type HierarchyNodeInput = { tenant_id: number; parent_id?: number; name: string; code: string };
export type ApiContract = { id: number; number: string; title: string; starts_at: string; ends_at: string; amount_cents: number; status: string };
export type ApiModule = { id: number; name: string; alias: string; enabled: boolean; metadata?: Record<string, unknown> };
export type UpdateTenantInput = Partial<CreateTenantInput>;
export type CreateUserInput = { name: string; email: string; password: string; is_platform_admin?: boolean; tenant_id?: number | null; role_id?: number | null };
export type CreateSystratUserInput = { name: string; email: string; password: string; password_confirmation: string; role_slug: string };
export type CreateInvitationInput = { email: string; role_slug: string; tenant_id?: number };
export type CreateTenantAdminInput = { name: string; email: string; password: string };
export type CreateContractInput = { number: string; title: string; starts_at: string; ends_at: string; amount_cents: number; status?: 'draft' | 'active' | 'suspended' | 'ended' };
export type UpdateContractInput = Partial<Pick<CreateContractInput, 'title' | 'starts_at' | 'ends_at' | 'amount_cents' | 'status'>>;

export class SysgovApi {
  private token: string | null = typeof window !== 'undefined' ? localStorage.getItem('sysgov_token') : null;
  private tenantSlug: string | null = typeof window !== 'undefined' ? localStorage.getItem('sysgov_tenant') : null;

  constructor(private readonly baseUrl = 'http://localhost:8000/api') {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body && typeof init.body === 'string') headers.set('Content-Type', 'application/json');

    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('sysgov_auth_token') ||
          localStorage.getItem('sysgov_token') ||
          this.token
        : this.token;

    const tenantId =
      typeof window !== 'undefined'
        ? localStorage.getItem('sysgov_active_tenant_id')
        : null;

    const tenantSlug =
      typeof window !== 'undefined'
        ? localStorage.getItem('sysgov_tenant') || this.tenantSlug
        : this.tenantSlug;

    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (tenantId) headers.set('X-Tenant-ID', tenantId);
    if (tenantSlug) headers.set('X-Tenant-Slug', tenantSlug);

    const fullUrl = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const response = await fetch(fullUrl, { ...init, headers });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(errorBody.message || `SYSGOV API respondeu ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async health(): Promise<{ status: string; service: string }> { return this.request('/health'); }

  async login(email: string, password: string, tenantSlug?: string): Promise<{ token: string; user: ApiUser; tenant: ApiTenant | null }> {
    const result = await this.request<{ token: string; user: ApiUser; tenant: ApiTenant | null }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, tenant_slug: tenantSlug }) });
    this.token = result.token;
    this.tenantSlug = result.tenant?.slug ?? null;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sysgov_token', result.token);
      localStorage.setItem('sysgov_user', JSON.stringify(result.user));
      if (this.tenantSlug) localStorage.setItem('sysgov_tenant', this.tenantSlug);
    }
    return result;
  }

  currentUser(): ApiUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('sysgov_user');
    if (!raw) return null;
    try { return JSON.parse(raw) as ApiUser; } catch { return null; }
  }

  async logout(): Promise<void> {
    try { await this.request('/auth/logout', { method: 'POST' }); }
    finally {
      this.token = null;
      this.tenantSlug = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sysgov_token');
        localStorage.removeItem('sysgov_user');
        localStorage.removeItem('sysgov_tenant');
      }
    }
  }

  // --- Admin Plataforma ---
  async tenants(): Promise<Paginated<ApiTenant>> { return this.request('/admin/tenants'); }
  async createTenant(input: CreateTenantInput): Promise<ApiTenant> { return this.request('/admin/tenants', { method: 'POST', body: JSON.stringify(input) }); }
  async updateTenant(id: number, input: UpdateTenantInput): Promise<ApiTenant> { return this.request(`/admin/tenants/${id}`, { method: 'PUT', body: JSON.stringify(input) }); }
  async users(params?: { search?: string; role?: string; status?: string; page?: number }): Promise<Paginated<ApiUserAdmin>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.role) qs.set('role', params.role);
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return this.request(`/admin/users${q ? `?${q}` : ''}`);
  }
  async createUser(input: CreateUserInput): Promise<ApiUser> { return this.request('/admin/users', { method: 'POST', body: JSON.stringify(input) }); }
  async createSystratUser(input: CreateSystratUserInput): Promise<ApiUserAdmin> { return this.request('/admin/users', { method: 'POST', body: JSON.stringify(input) }); }
  async getUser(id: number): Promise<ApiUserAdmin> { return this.request(`/admin/users/${id}`); }
  async updateSystratUser(id: number, input: { name?: string; email?: string; role_slug?: string; is_active?: boolean }): Promise<ApiUserAdmin> {
    return this.request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }
  async deactivateUser(id: number, reason: string): Promise<{ message: string }> {
    return this.request(`/admin/users/${id}/deactivate`, { method: 'POST', body: JSON.stringify({ reason }) });
  }
  async reactivateUser(id: number): Promise<ApiUserAdmin> { return this.request(`/admin/users/${id}/reactivate`, { method: 'POST' }); }
  async resetUserPassword(id: number): Promise<{ message: string }> { return this.request(`/admin/users/${id}/reset-password`, { method: 'POST' }); }
  async createTenantAdmin(tenantId: number, input: CreateTenantAdminInput): Promise<ApiUserAdmin> {
    return this.request(`/admin/tenants/${tenantId}/users/admin`, { method: 'POST', body: JSON.stringify(input) });
  }
  async tenantUsers(tenantId: number, params?: { search?: string; page?: number }): Promise<Paginated<ApiUserAdmin>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return this.request(`/admin/tenants/${tenantId}/users${q ? `?${q}` : ''}`);
  }
  async deactivateTenantUser(tenantId: number, userId: number, reason: string): Promise<{ message: string }> {
    return this.request(`/admin/tenants/${tenantId}/users/${userId}/deactivate`, { method: 'POST', body: JSON.stringify({ reason }) });
  }
  async assignRoles(userId: number, roleIds: number[], tenantId: number): Promise<{ user: ApiUser; role_ids: number[] }> {
    return this.request(`/admin/users/${userId}/roles`, { method: 'PUT', body: JSON.stringify({ tenant_id: tenantId, role_ids: roleIds }) });
  }
  async roles(): Promise<Paginated<ApiRole>> { return this.request('/admin/roles'); }
  async createRole(input: { name: string; slug: string; scope: 'systrat' | 'tenant'; description?: string; permission_ids?: number[] }): Promise<ApiRole> {
    return this.request('/admin/roles', { method: 'POST', body: JSON.stringify(input) });
  }
  async updateRole(id: number, input: { name?: string; slug?: string; description?: string; permission_ids?: number[] }): Promise<ApiRole> {
    return this.request(`/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }
  async deleteRole(id: number): Promise<void> { await this.request(`/admin/roles/${id}`, { method: 'DELETE' }); }
  async permissions(): Promise<Paginated<ApiPermission>> { return this.request('/admin/permissions'); }
  async invitations(): Promise<Paginated<ApiInvitation>> { return this.request('/admin/invitations'); }
  async createInvitation(input: CreateInvitationInput): Promise<ApiInvitation> { return this.request('/admin/invitations', { method: 'POST', body: JSON.stringify(input) }); }
  async resendInvitation(id: number): Promise<ApiInvitation> { return this.request(`/admin/invitations/${id}/resend`, { method: 'POST' }); }
  async cancelInvitation(id: number): Promise<void> { await this.request(`/admin/invitations/${id}`, { method: 'DELETE' }); }
  async acceptInvitation(token: string): Promise<{ message: string; user: ApiUser }> {
    return this.request('/admin/auth/accept-invitation', { method: 'POST', body: JSON.stringify({ token }) });
  }
  async auditLogs(): Promise<Paginated<Record<string, unknown>>> { return this.request('/admin/audit-logs'); }
  async financeSummary(): Promise<FinanceSummary> { return this.request('/finance/summary'); }
  async monitoring(): Promise<MonitoringSummary> { return this.request('/admin/monitoring'); }
  async hierarchy(tenantId?: number): Promise<OrganizationNode[]> { return this.request(`/admin/hierarchy${tenantId ? `?tenant_id=${tenantId}` : ''}`); }
  async createOrganization(input: Omit<HierarchyNodeInput, 'parent_id'>): Promise<Record<string, unknown>> { return this.request('/admin/hierarchy/organizations', { method: 'POST', body: JSON.stringify(input) }); }
  async createDepartment(input: HierarchyNodeInput): Promise<Record<string, unknown>> { return this.request('/admin/hierarchy/departments', { method: 'POST', body: JSON.stringify(input) }); }
  async createManagementUnit(input: HierarchyNodeInput): Promise<Record<string, unknown>> { return this.request('/admin/hierarchy/management-units', { method: 'POST', body: JSON.stringify(input) }); }
  async createBudgetUnit(input: HierarchyNodeInput): Promise<Record<string, unknown>> { return this.request('/admin/hierarchy/budget-units', { method: 'POST', body: JSON.stringify(input) }); }
  async contracts(): Promise<Paginated<ApiContract>> { return this.request('/contracts'); }
  async createContract(input: CreateContractInput): Promise<ApiContract> { return this.request('/contracts', { method: 'POST', body: JSON.stringify(input) }); }
  async updateContract(id: number, input: UpdateContractInput): Promise<ApiContract> { return this.request(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(input) }); }
  async modules(): Promise<Paginated<ApiModule>> { return this.request('/admin/modules'); }
  async toggleModule(tenantId: number, moduleId: number, enabled: boolean): Promise<{ enabled: boolean }> { return this.request(`/admin/tenants/${tenantId}/modules/${moduleId}`, { method: 'PUT', body: JSON.stringify({ enabled }) }); }

  // --- Módulo Organograma (org_units) ---
  async getOrgTree(options?: { rootId?: number; active?: boolean }): Promise<OrgUnitTreeNode[]> {
    const params = new URLSearchParams();
    if (options?.rootId) params.append('root_id', String(options.rootId));
    if (options?.active !== undefined) params.append('active', String(options.active));
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ data: OrgUnitTreeNode[] }>(`/org-units${query}`);
    return res.data;
  }

  async getOrgUnitsFlat(options?: { active?: boolean }): Promise<OrgUnit[]> {
    const params = new URLSearchParams({ flat: 'true' });
    if (options?.active !== undefined) params.append('active', String(options.active));
    const res = await this.request<{ data: OrgUnit[] }>(`/org-units?${params.toString()}`);
    return res.data;
  }

  async getOrgUnit(id: number): Promise<OrgUnit> {
    const res = await this.request<{ data: OrgUnit }>(`/org-units/${id}`);
    return res.data;
  }

  async getOrgScope(): Promise<OrgScopeSummary> {
    const res = await this.request<{ data: OrgScopeSummary }>('/org-units/scope');
    return res.data;
  }

  async createOrgUnit(input: CreateOrgUnitInput): Promise<OrgUnit> {
    const res = await this.request<{ message: string; data: OrgUnit }>('/org-units', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  }

  async updateOrgUnit(id: number, input: UpdateOrgUnitInput): Promise<OrgUnit> {
    const res = await this.request<{ message: string; data: OrgUnit }>(`/org-units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return res.data;
  }

  async moveOrgUnit(id: number, input: MoveOrgUnitInput): Promise<OrgUnit> {
    const res = await this.request<{ message: string; data: OrgUnit }>(`/org-units/${id}/move`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  }

  async deleteOrgUnit(id: number, reason?: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/org-units/${id}`, {
      method: 'DELETE',
      body: reason ? JSON.stringify({ reason }) : undefined,
    });
  }

  async linkOrgUnitUser(unitId: number, input: LinkOrgUnitUserInput): Promise<OrgUnitUserLink> {
    const res = await this.request<{ message: string; data: OrgUnitUserLink }>(`/org-units/${unitId}/users`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  }

  async unlinkOrgUnitUser(unitId: number, userId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/org-units/${unitId}/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async setPrimaryOrgUnit(unitId: number, userId: number): Promise<OrgUnitUserLink> {
    const res = await this.request<{ message: string; data: OrgUnitUserLink }>(`/org-units/${unitId}/users/${userId}/primary`, {
      method: 'POST',
    });
    return res.data;
  }

  async exportOrgChartJson(): Promise<OrgExportData> {
    const res = await this.request<{ data: OrgExportData }>('/org-units/export', {
      method: 'POST',
      body: JSON.stringify({ format: 'json' }),
    });
    return res.data;
  }

  async exportOrgChartCsv(): Promise<string> {
    const headers = new Headers();
    if (this.token) headers.set('Authorization', `Bearer ${this.token}`);
    if (this.tenantSlug) headers.set('X-Tenant-Slug', this.tenantSlug);
    headers.set('Content-Type', 'application/json');

    const res = await fetch(`${this.baseUrl}/org-units/export`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ format: 'csv' }),
    });

    if (!res.ok) throw new Error(`SYSGOV API respondeu ${res.status}`);
    return res.text();
  }

  // --- Admin Onboarding & Suporte (RN-ORG-011) ---
  async adminSeedOrgChart(tenantId: number): Promise<OrgUnitTreeNode[]> {
    const res = await this.request<{ message: string; data: OrgUnitTreeNode[] }>(`http://localhost:8000/admin/tenants/${tenantId}/org-units/seed`, {
      method: 'POST',
    });
    return res.data;
  }

  async adminGetOrgChart(tenantId: number): Promise<OrgUnitTreeNode[]> {
    const res = await this.request<{ data: OrgUnitTreeNode[] }>(`http://localhost:8000/admin/tenants/${tenantId}/org-units`);
    return res.data;
  }
}

export const sysgovApi = new SysgovApi();
