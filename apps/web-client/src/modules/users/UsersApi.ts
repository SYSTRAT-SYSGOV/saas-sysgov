import { apiClient } from '@/core/api/client';
import { CreateTenantUserInput, PaginatedTenantUsers, TenantUser, UpdateTenantUserInput } from './types';

export const usersApi = {
  async list(params?: { search?: string; role?: string; status?: string; page?: number }): Promise<PaginatedTenantUsers> {
    const { data } = await apiClient.get<PaginatedTenantUsers>('/users', { params });
    return data;
  },

  async create(input: CreateTenantUserInput): Promise<TenantUser> {
    const { data } = await apiClient.post<{ data: TenantUser }>('/users', input);
    return data.data;
  },

  async get(id: number): Promise<TenantUser> {
    const { data } = await apiClient.get<{ data: TenantUser }>(`/users/${id}`);
    return data.data;
  },

  async update(id: number, input: UpdateTenantUserInput): Promise<TenantUser> {
    const { data } = await apiClient.put<{ data: TenantUser }>(`/users/${id}`, input);
    return data.data;
  },

  async deactivate(id: number, reason: string): Promise<void> {
    await apiClient.post(`/users/${id}/deactivate`, { reason });
  },

  async reactivate(id: number): Promise<TenantUser> {
    const { data } = await apiClient.post<{ data: TenantUser }>(`/users/${id}/reactivate`);
    return data.data;
  },
};
