import type { Paginated, TenantContext } from './index';

export type ApiUser = { id: number; name: string; email: string; is_platform_admin: boolean };
export type ApiTenant = TenantContext & { id: number; status: 'active' | 'suspended' | 'trial'; type: string };
export type CreateTenantInput = { name: string; slug: string; cnpj?: string; type: 'prefeitura' | 'parceiro' | 'interno'; status?: 'active' | 'suspended' | 'trial'; settings?: Record<string, unknown> };
export type ApiRole = { id: number; name: string; tenant_id: number | null; permissions: ApiPermission[] };
export type ApiPermission = { id: number; name: string; tenant_id: number | null };
export type FinanceSummary = { tenant_id: number; revenues_cents: number; expenses_cents: number; invoices_cents: number; transfers_cents: number; pending_reconciliations: number };
export type MonitoringSummary = { generated_at: string; database: { status: string }; counts: Record<string, number>; outbox: Record<'pending' | 'processing' | 'failed', number> };
export type OrganizationNode = { id: number; name: string; code: string; departments: Array<{ id: number; name: string; code: string; management_units: Array<{ id: number; name: string; code: string; budget_units: Array<{ id: number; name: string; code: string }> }> }> };
export type HierarchyNodeInput = { tenant_id: number; parent_id?: number; name: string; code: string };
export type ApiContract = { id: number; number: string; title: string; starts_at: string; ends_at: string; amount_cents: number; status: string };
export type ApiModule = { id: number; name: string; alias: string; enabled: boolean; metadata?: Record<string, unknown> };
export type UpdateTenantInput = Partial<CreateTenantInput>;
export type CreateUserInput = { name: string; email: string; password: string; is_platform_admin?: boolean; tenant_id?: number | null; role_id?: number | null };
export type CreateContractInput = { number: string; title: string; starts_at: string; ends_at: string; amount_cents: number; status?: 'draft' | 'active' | 'suspended' | 'ended' };
export type UpdateContractInput = Partial<Pick<CreateContractInput, 'title' | 'starts_at' | 'ends_at' | 'amount_cents' | 'status'>>;

export class SysgovApi {
  private token: string | null = localStorage.getItem('sysgov_token');
  private tenantSlug: string | null = localStorage.getItem('sysgov_tenant');
  constructor(private readonly baseUrl = 'http://localhost:8000/api') {}
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body) headers.set('Content-Type', 'application/json');
    if (this.token) headers.set('Authorization', `Bearer ${this.token}`);
    if (this.tenantSlug) headers.set('X-Tenant-Slug', this.tenantSlug);
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (!response.ok) throw new Error(`SYSGOV API respondeu ${response.status}`);
    return response.json() as Promise<T>;
  }
  async health(): Promise<{ status: string; service: string }> { return this.request('/health'); }
  async login(email: string, password: string, tenantSlug?: string): Promise<{ token: string; user: ApiUser; tenant: ApiTenant | null }> {
    const result = await this.request<{ token: string; user: ApiUser; tenant: ApiTenant | null }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, tenant_slug: tenantSlug }) });
    this.token = result.token; this.tenantSlug = result.tenant?.slug ?? null;
    localStorage.setItem('sysgov_token', result.token);
    localStorage.setItem('sysgov_user', JSON.stringify(result.user));
    if (this.tenantSlug) localStorage.setItem('sysgov_tenant', this.tenantSlug);
    return result;
  }
  currentUser(): ApiUser | null {
    const raw = localStorage.getItem('sysgov_user');
    if (!raw) return null;
    try { return JSON.parse(raw) as ApiUser; } catch { return null; }
  }
  async logout(): Promise<void> {
    try { await this.request('/auth/logout', { method: 'POST' }); }
    finally { this.token = null; this.tenantSlug = null; localStorage.removeItem('sysgov_token'); localStorage.removeItem('sysgov_user'); localStorage.removeItem('sysgov_tenant'); }
  }
  async tenants(): Promise<Paginated<ApiTenant>> { return this.request('/admin/tenants'); }
  async createTenant(input: CreateTenantInput): Promise<ApiTenant> { return this.request('/admin/tenants', { method: 'POST', body: JSON.stringify(input) }); }
  async updateTenant(id: number, input: UpdateTenantInput): Promise<ApiTenant> { return this.request(`/admin/tenants/${id}`, { method: 'PUT', body: JSON.stringify(input) }); }
  async users(): Promise<Paginated<ApiUser & { tenants: ApiTenant[] }>> { return this.request('/admin/users'); }
  async createUser(input: CreateUserInput): Promise<ApiUser> { return this.request('/admin/users', { method: 'POST', body: JSON.stringify(input) }); }
  async assignRoles(userId: number, roleIds: number[], tenantId: number): Promise<{ user: ApiUser; role_ids: number[] }> {
    return this.request(`/admin/users/${userId}/roles`, { method: 'PUT', body: JSON.stringify({ tenant_id: tenantId, role_ids: roleIds }) });
  }
  async roles(): Promise<Paginated<ApiRole>> { return this.request('/admin/roles'); }
  async permissions(): Promise<Paginated<ApiPermission>> { return this.request('/admin/permissions'); }
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
}

export const sysgovApi = new SysgovApi();
