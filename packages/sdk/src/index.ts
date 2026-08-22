export type TenantContext = { slug: string; name: string; settings: Record<string, unknown> };
export type Paginated<T> = { data: T[]; current_page: number; last_page: number; total: number };
export { SysgovApi, sysgovApi } from './client';
export type { ApiUser, ApiTenant, CreateTenantInput, ApiRole, ApiPermission, FinanceSummary, MonitoringSummary, OrganizationNode, HierarchyNodeInput, ApiContract, ApiModule } from './client';
