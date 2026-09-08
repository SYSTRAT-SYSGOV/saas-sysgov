import React from 'react';
import { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Building2,
  Table,
  Layers,
  CreditCard,
  Plug,
  ShieldAlert,
  Settings,
  UserCheck,
  FileText,
  Ticket,
  BookOpen,
  Database,
} from 'lucide-react';
import { lazyWithNamedExport } from '@/lib/lazy';

export interface AdminModuleDefinition {
  id: string;
  name: string;
  path: string;
  // Módulos podem ou não usar as props injetadas via contexto do Outlet
  // (onNavigate/onAddToast) — ver ModuleRoute em core/router/AppRouter.tsx.
  component: React.LazyExoticComponent<React.FC<any>>;
  requiredPermission?: string;
  icon?: LucideIcon;
  badge?: string;
  badgeColor?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'blue' | 'slate';
  description?: string;
  allowedRoles?: string[];
}

export const ADMIN_MODULE_REGISTRY: Record<string, AdminModuleDefinition> = {
  admin_dashboard: {
    id: 'admin_dashboard',
    name: 'Visão Geral & KPIs',
    path: '/admin/dashboard',
    // Nota: DashboardPage é o componente monolítico legado (App.tsx antigo),
    // que só renderiza algo quando recebe uma prop `activeTab` — o ModuleRoute
    // atual não a passa, então ele ficava em branco. AdminDashboardOverview é
    // o card de métricas que substitui essa tela na Admin Suite.
    component: lazyWithNamedExport(() => import('@/components/admin/AdminDashboardOverview'), 'AdminDashboardOverview'),
    requiredPermission: 'admin.dashboard.view',
    icon: LayoutDashboard,
    badge: 'Ao Vivo',
    badgeColor: 'emerald',
    description: 'Métricas executivas consolidadas, receita e atividade do sistema',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'ANALYST'],
  },
  admin_analytics: {
    id: 'admin_analytics',
    name: 'Desempenho & Métricas',
    path: '/admin/analytics',
    component: lazyWithNamedExport(() => import('@/components/admin/AdminAnalyticsView'), 'AdminAnalyticsView'),
    requiredPermission: 'admin.analytics.view',
    icon: BarChart3,
    badge: 'Analytics',
    badgeColor: 'indigo',
    description: 'Gráficos comparativos, tendências e análises de conversão',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'ANALYST'],
  },
  admin_users: {
    id: 'admin_users',
    name: 'Usuários & Permissões',
    path: '/admin/users',
    component: lazyWithNamedExport(() => import('@/modules/admin/UserAccessModule'), 'UserAccessModule'),
    requiredPermission: 'admin.users.manage',
    icon: Users,
    badge: 'RBAC',
    badgeColor: 'blue',
    description: 'Gerenciamento de contas, papéis de acesso e permissões',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
  },
  admin_tenants: {
    id: 'admin_tenants',
    name: 'Organizações & Tenants',
    path: '/admin/tenants',
    component: lazyWithNamedExport(() => import('@/components/admin/AdminTenantManagement'), 'AdminTenantManagement'),
    requiredPermission: 'admin.tenants.manage',
    icon: Building2,
    badge: 'Multi-Tenant',
    badgeColor: 'amber',
    description: 'Gestão de clientes, cotas de uso, limites e subdomínios',
    allowedRoles: ['SUPER_ADMIN'],
  },
  admin_records: {
    id: 'admin_records',
    name: 'Registros & Tabelas',
    path: '/admin/records',
    component: lazyWithNamedExport(() => import('@/components/admin/AdminGenericDataTable'), 'AdminGenericDataTable'),
    requiredPermission: 'admin.records.view',
    icon: Table,
    badge: 'CRUD',
    badgeColor: 'slate',
    description: 'Tabela de dados avançada com filtros, ordenação e exportação',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
  },
  admin_menus: {
    id: 'admin_menus',
    name: 'Gerenciador de Menus',
    path: '/admin/menus',
    component: lazyWithNamedExport(() => import('@/modules/admin/MenuManager'), 'MenuManager'),
    requiredPermission: 'admin.menus.manage',
    icon: Layers,
    badge: 'Novo',
    badgeColor: 'emerald',
    description: 'Configuração dinâmica de grupos e itens do menu lateral',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
  },
  admin_billing: {
    id: 'admin_billing',
    name: 'Faturamento & Invoices',
    path: '/admin/billing',
    component: lazyWithNamedExport(() => import('@/components/admin/AdminFinancialBilling'), 'AdminFinancialBilling'),
    requiredPermission: 'admin.billing.view',
    icon: CreditCard,
    badge: 'MRR',
    badgeColor: 'emerald',
    description: 'Demonstrativo financeiro, histórico de faturas e planos',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
  },
  admin_apis: {
    id: 'admin_apis',
    name: 'APIs & Integrações',
    path: '/admin/apis',
    component: lazyWithNamedExport(() => import('@/components/admin/AdminApiIntegrations'), 'AdminApiIntegrations'),
    requiredPermission: 'admin.apis.manage',
    icon: Plug,
    badge: 'Webhooks',
    badgeColor: 'indigo',
    description: 'Monitoramento de integradores, latência e conectores',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
  },
  admin_logs: {
    id: 'admin_logs',
    name: 'Logs & Auditoria',
    path: '/admin/logs',
    component: lazyWithNamedExport(() => import('@/components/admin/AdminAuditLogs'), 'AdminAuditLogs'),
    requiredPermission: 'admin.logs.view',
    icon: ShieldAlert,
    badge: 'Audit',
    badgeColor: 'rose',
    description: 'Rastreabilidade de ações, eventos de segurança e erros',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
  },
  admin_settings: {
    id: 'admin_settings',
    name: 'Configurações & White-Label',
    path: '/admin/settings',
    component: lazyWithNamedExport(() => import('@/components/admin/AdminSettings'), 'AdminSettings'),
    requiredPermission: 'admin.settings.manage',
    icon: Settings,
    badge: 'Custom',
    badgeColor: 'slate',
    description: 'Personalização visual, logotipo, parâmetros e segurança',
    allowedRoles: ['SUPER_ADMIN'],
  },
  admin_profile: {
    id: 'admin_profile',
    name: 'Meu Perfil & Segurança',
    path: '/admin/profile',
    component: lazyWithNamedExport(() => import('@/components/admin/AdminUserProfile'), 'AdminUserProfile'),
    requiredPermission: 'admin.profile.view',
    icon: UserCheck,
    description: 'Dados da conta autenticada, senha e sessões ativas',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'ANALYST'],
  },
  contratos: {
    id: 'contratos',
    name: 'Gestão de Contratos',
    path: '/admin/contratos',
    component: lazyWithNamedExport(() => import('@/components/ModuleContratos'), 'ModuleContratos'),
    requiredPermission: 'admin.contratos.view',
    icon: FileText,
    badge: 'Lei 14.133',
    badgeColor: 'indigo',
    description: 'Ciclo de vida contratual, aditivos (25%), fiscalização e anexos',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
  },
  helpdesk: {
    id: 'helpdesk',
    name: 'Suporte & Helpdesk',
    path: '/admin/helpdesk',
    component: lazyWithNamedExport(() => import('@/components/ModuleHelpdesk'), 'ModuleHelpdesk'),
    requiredPermission: 'admin.helpdesk.view',
    icon: Ticket,
    badge: 'SLA',
    badgeColor: 'amber',
    description: 'Chamados internos com SLA automático por prioridade',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
  },
  contabilidade: {
    id: 'contabilidade',
    name: 'Contabilidade Pública',
    path: '/admin/contabilidade',
    component: lazyWithNamedExport(() => import('@/components/ModuleContabilidade'), 'ModuleContabilidade'),
    requiredPermission: 'admin.contabilidade.view',
    icon: BookOpen,
    badge: 'PCASP',
    badgeColor: 'emerald',
    description: 'PCASP, empenho-liquidação-pagamento e partidas dobradas',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
  },
  module_catalog: {
    id: 'module_catalog',
    name: 'Módulos da Plataforma',
    path: '/admin/module-catalog',
    component: lazyWithNamedExport(() => import('@/modules/admin/ModuleCatalogPage'), 'ModuleCatalogPage'),
    requiredPermission: 'admin.modules.manage',
    icon: Database,
    badge: 'Catálogo',
    badgeColor: 'indigo',
    description: 'Catálogo de módulos disponíveis para provisionamento',
    allowedRoles: ['SUPER_ADMIN'],
  },
};

export function getAdminModuleByPath(path: string): AdminModuleDefinition | undefined {
  return Object.values(ADMIN_MODULE_REGISTRY).find(m => m.path === path);
}

export function getAdminModuleById(id: string): AdminModuleDefinition | undefined {
  return ADMIN_MODULE_REGISTRY[id];
}

export function getAllowedAdminModules(roles: string[]): AdminModuleDefinition[] {
  return Object.values(ADMIN_MODULE_REGISTRY).filter(
    m => !m.allowedRoles || m.allowedRoles.some(r => roles.includes(r))
  );
}