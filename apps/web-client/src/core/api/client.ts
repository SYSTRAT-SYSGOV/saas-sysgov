import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { obterEscolaAtiva, precisaEscola } from '@/core/escola/escolaAtiva';
import { obterCampanhaAtiva, precisaCampanha } from '@/core/campanha/campanhaAtiva';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 45000,
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

    // Escola de trabalho só nas rotas de Escola, Pedagógico, Formatura e Passeio.
    const escolaAtiva = obterEscolaAtiva();
    if (escolaAtiva !== null && precisaEscola(config.url)) {
      config.headers['X-Escola-ID'] = String(escolaAtiva);
    }

    // Campanha de trabalho só nas rotas de dados do módulo Campanha Política.
    const campanhaAtiva = obterCampanhaAtiva();
    if (campanhaAtiva !== null && precisaCampanha(config.url)) {
      config.headers['X-Campanha-ID'] = String(campanhaAtiva);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);
