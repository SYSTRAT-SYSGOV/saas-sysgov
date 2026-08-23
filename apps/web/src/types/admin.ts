export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER' | 'EMPRESA_MASTER' | 'PREFEITURA_CLIENTE';

export type UserStatus = 'active' | 'pending' | 'suspended' | 'inactive';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: AdminRole;
  department: string;
  status: UserStatus;
  lastLoginAt?: string;
  createdAt: string;
  permissions: string[];
  tenantId?: string;
  tenantName?: string;
}

export type TenantPlan = 'starter' | 'professional' | 'enterprise' | 'custom';
export type TenantStatus = 'active' | 'trialing' | 'past_due' | 'suspended' | 'cancelled';

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  plan: TenantPlan;
  status: TenantStatus;
  userCount: number;
  maxUsers: number;
  storageUsedMb: number;
  storageLimitMb: number;
  monthlyRevenue: number;
  currency: string;
  createdAt: string;
  ownerEmail: string;
  customBranding?: {
    logoUrl?: string;
    primaryColor?: string;
    portalTitle?: string;
    customDomainActive?: boolean;
  };
}

export interface MetricCardData {
  id: string;
  title: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  changePercentage: number;
  isPositiveChange: boolean;
  periodLabel: string;
  badge?: string;
  sparklineData?: number[];
  colorScheme: 'emerald' | 'indigo' | 'cyan' | 'amber' | 'rose' | 'slate';
}

export interface ActivityEvent {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: string;
  target: string;
  category: 'auth' | 'system' | 'billing' | 'data' | 'security';
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
  details?: string;
}

export interface ChartDataPoint {
  label: string;
  [key: string]: string | number;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'refunded';
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
  pdfUrl?: string;
  plan: string;
}

export interface ApiConnector {
  id: string;
  name: string;
  endpoint: string;
  type: 'REST' | 'GRAPHQL' | 'WEBHOOK' | 'DATABASE' | 'OAUTH';
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  uptimePercent: number;
  latencyMs: number;
  lastSyncAt: string;
  requests24h: number;
  errorRatePercent: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  service: string;
  actor: {
    id: string;
    name: string;
    email: string;
    ipAddress: string;
  };
  event: string;
  targetResource: string;
  payload?: Record<string, any>;
  statusCode?: number;
}

export interface GenericRecord {
  id: string;
  code: string;
  title: string;
  category: string;
  status: 'ativo' | 'rascunho' | 'arquivado' | 'em_revisao';
  priority: 'alta' | 'media' | 'baixa' | 'critica';
  value: number;
  assignee: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface SystemBrandingConfig {
  appName: string;
  appSubtitle: string;
  companyName: string;
  logoUrl: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  enableDarkMode: boolean;
  showPoweredBy: boolean;
  supportEmail: string;
  version: string;
}
