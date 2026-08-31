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
  is_platform_admin?: boolean;
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

// Tipos do Módulo de Organograma (org_units)
export type OrgUnitType = 'raiz' | 'secretaria' | 'departamento' | 'divisao' | 'setor' | 'autarquia' | 'fundacao' | string;
export type OrgUnitRole = 'responsavel' | 'membro' | string;

export interface OrgUnitResponsible {
  id: number;
  name: string;
  email: string;
  role: string;
  is_primary?: boolean;
}

export interface OrgUnit {
  id: number;
  tenant_id: number;
  parent_id?: number | null;
  name: string;
  code: string;
  acronym?: string | null;
  type: OrgUnitType;
  level: number;
  path: string;
  order: number;
  is_active: boolean;
  inactivation_reason?: string | null;
  metadata?: Record<string, unknown> | null;
  parent?: Pick<OrgUnit, 'id' | 'name' | 'code' | 'acronym'> | null;
  responsibles?: OrgUnitResponsible[];
  users_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrgUnitTreeNode extends OrgUnit {
  children: OrgUnitTreeNode[];
}

export interface OrgUnitUserLink {
  id: number;
  tenant_id: number;
  org_unit_id: number;
  user_id: number;
  role: OrgUnitRole;
  is_primary: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
  metadata?: Record<string, unknown> | null;
  user?: User;
  org_unit?: OrgUnit;
}

export interface OrgScopeSummary {
  is_unrestricted: boolean;
  allowed_unit_ids: number[];
  primary_unit: {
    id: number;
    name: string;
    code: string;
    acronym?: string | null;
    role: string;
  } | null;
  managed_units: Array<{
    id: number;
    name: string;
    code: string;
    acronym?: string | null;
  }>;
}

export interface CreateOrgUnitInput {
  name: string;
  code: string;
  acronym?: string | null;
  type: OrgUnitType;
  parent_id?: number | null;
  order?: number;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateOrgUnitInput {
  name?: string;
  code?: string;
  acronym?: string | null;
  type?: OrgUnitType;
  order?: number;
  metadata?: Record<string, unknown> | null;
}

export interface MoveOrgUnitInput {
  new_parent_id?: number | null;
  new_order?: number;
}

export interface LinkOrgUnitUserInput {
  user_id: number;
  role: OrgUnitRole;
  is_primary?: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface OrgExportManifest {
  version: string;
  schema: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_name: string;
  generated_at: string;
  total_units: number;
  total_user_links: number;
  checksum_sha256: string;
}

export interface OrgExportData {
  manifest: OrgExportManifest;
  tree: OrgUnitTreeNode[];
  units: OrgUnit[];
  users: OrgUnitUserLink[];
}

export { SysgovApi, sysgovApi } from './client';
export type {
  ApiUser,
  ApiTenant,
  CreateTenantInput,
  UpdateTenantInput,
  CreateUserInput,
  CreateSystratUserInput,
  CreateInvitationInput,
  CreateTenantAdminInput,
  ApiRole,
  ApiPermission,
  ApiTenantLink,
  ApiUserAdmin,
  ApiInvitation,
  FinanceSummary,
  MonitoringSummary,
  OrganizationNode,
  HierarchyNodeInput,
  ApiContract,
  CreateContractInput,
  UpdateContractInput,
  ApiModule,
} from './client';
