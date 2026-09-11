import React from 'react';
import { AdminRole } from '../types/admin';
import { ADMIN_MODULE_REGISTRY, AdminModuleDefinition } from './adminModuleRegistry';

export interface AdminNavItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'blue' | 'slate';
  description: string;
  allowedRoles?: AdminRole[];
  path?: string;
}

export interface AdminNavGroup {
  id: string;
  title: string;
  items: AdminNavItem[];
}

function mapModuleToNavItem(module: AdminModuleDefinition): AdminNavItem {
  return {
    id: module.id,
    label: module.name,
    shortLabel: module.name.split(' & ')[0].split(' ')[0],
    icon: module.icon as React.ElementType,
    badge: module.badge,
    badgeColor: module.badgeColor,
    description: module.description || '',
    allowedRoles: module.allowedRoles as AdminRole[] | undefined,
    path: module.path,
  };
}

function groupModulesByCategory(modules: AdminModuleDefinition[]): AdminNavGroup[] {
  const categoryMap: Record<string, AdminModuleDefinition[]> = {
    core_analytics: [],
    management: [],
    finance_integrations: [],
    system_settings: [],
    contratos_contabilidade: [],
  };

  for (const module of modules) {
    if (['admin_dashboard', 'admin_analytics'].includes(module.id)) {
      categoryMap.core_analytics.push(module);
    } else if (['admin_users', 'admin_tenants', 'admin_records', 'admin_menus'].includes(module.id)) {
      categoryMap.management.push(module);
    } else if (['admin_billing', 'admin_apis', 'admin_logs'].includes(module.id)) {
      categoryMap.finance_integrations.push(module);
    } else if (['admin_settings', 'admin_ai', 'admin_profile'].includes(module.id)) {
      categoryMap.system_settings.push(module);
    } else if (['contratos', 'helpdesk', 'contabilidade'].includes(module.id)) {
      categoryMap.contratos_contabilidade.push(module);
    }
  }

  const categoryTitles: Record<string, string> = {
    core_analytics: 'PAINEL PRINCIPAL',
    management: 'GESTÃO & CADASTROS',
    finance_integrations: 'FINANCEIRO & INFRAESTRUTURA',
    system_settings: 'SISTEMA & PREFERÊNCIAS',
    contratos_contabilidade: 'CONTRATOS & CONTABILIDADE',
  };

  return Object.entries(categoryMap)
    .filter(([, items]) => items.length > 0)
    .map(([id, items]) => ({
      id,
      title: categoryTitles[id] || id.toUpperCase(),
      items: items.map(mapModuleToNavItem),
    }));
}

export function getAdminNavGroups(roles: string[]): AdminNavGroup[] {
  const allowedModules = Object.values(ADMIN_MODULE_REGISTRY).filter(
    m => !m.allowedRoles || m.allowedRoles.some(r => roles.includes(r))
  );
  return groupModulesByCategory(allowedModules);
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = groupModulesByCategory(
  Object.values(ADMIN_MODULE_REGISTRY)
);

export { type AdminModuleDefinition } from './adminModuleRegistry';