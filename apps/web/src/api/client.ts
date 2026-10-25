/**
 * Cliente HTTP tipado com injeção automática de token JWT e tenantId.
 */

import { ApiRequestError } from './errors';
import { withApiBase } from '../config/env';

export interface RequestOptions extends RequestInit {
  tenantId?: string;
  token?: string;
}

class ApiClient {
  private baseUrl: string = '';

  private getAuthToken(): string | null {
    try {
      const stored = localStorage.getItem('sgf_auth_token') ?? localStorage.getItem('auth_token');
      // Ignora tokens antigos do mock ('jwt_master_*') — o backend os rejeita (401)
      return stored && !stored.startsWith('jwt_master_') ? stored : null;
    } catch {
      return null;
    }
  }

  private getActiveTenantId(): string | null {
    try {
      return localStorage.getItem('sgf_active_tenant_id');
    } catch {
      return null;
    }
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = options.token || this.getAuthToken();
    const tenantId = options.tenantId || this.getActiveTenantId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (tenantId) {
      headers['X-Tenant-Id'] = tenantId;
    }

    const url = withApiBase(endpoint);

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMsg = `Erro na requisição (${res.status} ${res.statusText})`;
      let errorJson: unknown = null;
      try {
        errorJson = await res.json();
        const e = errorJson as { message?: string; error?: string };
        errorMsg = e.message || e.error || errorMsg;
      } catch {}
      throw new ApiRequestError(errorMsg, res.status, errorJson);
    }

    return res.json();
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;
