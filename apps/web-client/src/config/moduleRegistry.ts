import React, { lazy } from 'react';

export interface ModuleDefinition {
  id: string;
  name: string;
  component: React.LazyExoticComponent<React.FC>;
  requiredPermission?: string;
}

export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  dashboard: {
    id: 'dashboard',
    name: 'Painel Geral',
    component: lazy(() => import('@/modules/dashboard/DashboardModule')),
    requiredPermission: 'dashboard.view',
  },
  org: {
    id: 'org',
    name: 'Organograma Municipal',
    component: lazy(() => import('@/modules/orgchart/OrgChartModule')),
    requiredPermission: 'org.view',
  },
  procurement: {
    id: 'procurement',
    name: 'Licitações & Editais',
    component: lazy(() => import('@/modules/procurement/ProcurementModule')),
    requiredPermission: 'procurement.view',
  },
  contracts: {
    id: 'contracts',
    name: 'Contratos & Aditivos',
    component: lazy(() => import('@/modules/contracts/ContractsModule')),
    requiredPermission: 'contracts.view',
  },
  finance: {
    id: 'finance',
    name: 'Execução Financeira',
    component: lazy(() => import('@/modules/finance/FinanceModule')),
    requiredPermission: 'finance.view',
  },
  pedagogico: {
    id: 'pedagogico',
    name: 'Módulo Pedagógico',
    component: lazy(() => import('@/modules/pedagogico/PedagogicoModule')),
    requiredPermission: 'pedagogico.view',
  },
  rh: {
    id: 'rh',
    name: 'Recursos Humanos',
    component: lazy(() => import('@/modules/rh/RhModule')),
    requiredPermission: 'rh.view',
  },
  cemiterios: {
    id: 'cemiterios',
    name: 'Gestão de Cemitérios',
    component: lazy(() => import('@/modules/cemiterios/CemiteriosModule')),
    requiredPermission: 'cemiterios.view',
  },
};
