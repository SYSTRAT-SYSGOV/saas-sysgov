import { apiClient } from '@/core/api/client';

export interface MenuGroup {
  id: number;
  tenant_id: number | null;
  name: string;
  slug: string;
  icon: string | null;
  order: number;
  is_active: boolean;
  items?: MenuItem[];
}

export interface MenuItem {
  id: number;
  tenant_id: number | null;
  menu_group_id: number;
  label: string;
  icon: string | null;
  route: string;
  permission: string | null;
  shortcut: string | null;
  module_alias: string | null;
  order: number;
  is_active: boolean;
}

export const menuApi = {
  async groups(): Promise<MenuGroup[]> {
    const { data } = await apiClient.get<{ data: MenuGroup[] }>('/admin/menus');
    return data.data;
  },

  async createGroup(input: { name: string; slug: string; icon?: string | null; order?: number }): Promise<MenuGroup> {
    const { data } = await apiClient.post<{ data: MenuGroup }>('/admin/menus/groups', input);
    return data.data;
  },

  async updateGroup(id: number, input: { name?: string; slug?: string; icon?: string | null; order?: number; is_active?: boolean }): Promise<MenuGroup> {
    const { data } = await apiClient.put<{ data: MenuGroup }>(`/admin/menus/groups/${id}`, input);
    return data.data;
  },

  async deleteGroup(id: number): Promise<void> {
    await apiClient.delete(`/admin/menus/groups/${id}`);
  },

  async createItem(input: {
    menu_group_id: number;
    label: string;
    route: string;
    icon?: string | null;
    permission?: string | null;
    shortcut?: string | null;
    module_alias?: string | null;
    order?: number;
  }): Promise<MenuItem> {
    const { data } = await apiClient.post<{ data: MenuItem }>('/admin/menus/items', input);
    return data.data;
  },

  async updateItem(id: number, input: {
    label?: string;
    route?: string;
    icon?: string | null;
    permission?: string | null;
    shortcut?: string | null;
    module_alias?: string | null;
    order?: number;
    is_active?: boolean;
  }): Promise<MenuItem> {
    const { data } = await apiClient.put<{ data: MenuItem }>(`/admin/menus/items/${id}`, input);
    return data.data;
  },

  async deleteItem(id: number): Promise<void> {
    await apiClient.delete(`/admin/menus/items/${id}`);
  },
};
