import { MenuGroup, User, MenuItem } from './types';
import { withApiBase } from '../../config/env';

const BASE = withApiBase('/api/admin');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('sgf_auth_token') ?? window.localStorage.getItem('auth_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`[AdminAPI] Falha em ${path}:`, err);
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export const adminApi = {
  async getNavigation(): Promise<MenuGroup[]> {
    return request<MenuGroup[]>('/navigation');
  },

  async getMenus(): Promise<MenuGroup[]> {
    return request<MenuGroup[]>('/menus');
  },

  async createGroup(payload: Partial<MenuGroup>): Promise<MenuGroup> {
    return request<MenuGroup>('/menus/groups', { method: 'POST', body: JSON.stringify(payload) });
  },

  async updateGroup(id: number, payload: Partial<MenuGroup>): Promise<MenuGroup> {
    return request<MenuGroup>(`/menus/groups/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async deleteGroup(id: number): Promise<void> {
    await request<void>(`/menus/groups/${id}`, { method: 'DELETE' });
  },

  async createItem(payload: Partial<MenuItem>): Promise<MenuItem> {
    return request<MenuItem>('/menus/items', { method: 'POST', body: JSON.stringify(payload) });
  },

  async updateItem(id: number, payload: Partial<MenuItem>): Promise<MenuItem> {
    return request<MenuItem>(`/menus/items/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async deleteItem(id: number): Promise<void> {
    await request<void>(`/menus/items/${id}`, { method: 'DELETE' });
  },

  async getUsers(query?: string): Promise<User[]> {
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    return request<User[]>(`/users${qs}`);
  },

  async createUser(payload: Partial<User> & { password: string; password_confirmation: string }): Promise<User> {
    return request<User>('/users', { method: 'POST', body: JSON.stringify(payload) });
  },

  async updateUser(id: number, payload: Partial<User> & { password?: string; password_confirmation?: string }): Promise<User> {
    return request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async deleteUser(id: number): Promise<void> {
    await request<void>(`/users/${id}`, { method: 'DELETE' });
  },

  async getTenantOrgChart(tenantId: string | number): Promise<any[]> {
    return request<any[]>(`/tenants/${tenantId}/org-units`);
  },

  async seedTenantOrgChart(tenantId: string | number): Promise<{ message: string; total_units: number }> {
    return request<{ message: string; total_units: number }>(`/tenants/${tenantId}/org-units/seed`, { method: 'POST' });
  },
};
