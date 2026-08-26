import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('sysgov_auth_token');
    const activeTenantId = localStorage.getItem('sysgov_active_tenant_id');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (activeTenantId) {
      config.headers['X-Tenant-ID'] = activeTenantId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

const DEMO_TOKEN_FRAGMENT = 'abc123demo-sysgov-2026';

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authHeader = String(error.config?.headers?.Authorization ?? '');
      const isDemoToken = authHeader.includes(DEMO_TOKEN_FRAGMENT);
      // Token de demonstração nunca deve provocar bounce de página inteira
      // (em modo demo o backend pode subir a qualquer momento e o token é inválido).
      if (!isDemoToken && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('sysgov_auth_token');
        localStorage.removeItem('sysgov_auth_state');
        localStorage.removeItem('sysgov_active_tenant_id');
        window.location.href = '/login';
        // A página já está navegando para /login: não propaga o erro ao chamador,
        // evitando que ele exiba "Request failed with status code 401".
        return new Promise(() => {});
      }
    }
    return Promise.reject(error);
  }
);
