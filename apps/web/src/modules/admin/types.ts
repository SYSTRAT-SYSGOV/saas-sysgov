import React from 'react';

export interface MenuItem {
  id: number;
  label: string;
  icon: string;
  route: string;
  permission?: string;
  shortcut?: string;
  module_alias?: string;
  order: number;
  is_active: boolean;
  badge?: { value: number; tone: 'rose' | 'amber' };
}

export interface MenuGroup {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  order: number;
  is_active: boolean;
  items: MenuItem[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  is_platform_admin: boolean;
  created_at: string;
  tenants: TenantLink[];
  roles?: { id: number; name: string }[];
}

export interface TenantLink {
  id: number;
  name: string;
  slug: string;
  role_id?: number;
}
