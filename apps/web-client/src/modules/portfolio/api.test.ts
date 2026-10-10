import { afterEach, describe, expect, it } from 'vitest';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '@/core/api/client';
import { portfolioApi } from './api';

const adapterOriginal = apiClient.defaults.adapter;
afterEach(() => { apiClient.defaults.adapter = adapterOriginal; });

describe('portfolioApi.enviarImagem', () => {
  it('envia a foto como multipart (o apiClient tem Content-Type JSON por padrão)', async () => {
    let enviado: InternalAxiosRequestConfig | null = null;
    const capturar: AxiosAdapter = async (config) => {
      enviado = config;
      return { data: { data: { id: 1, nome: 'a.jpg', url: '/x' } }, status: 201, statusText: 'Created', headers: {}, config };
    };
    apiClient.defaults.adapter = capturar;

    await portfolioApi.enviarImagem(7, new Blob(['jpeg'], { type: 'image/jpeg' }), 'a.jpg');

    expect(enviado).not.toBeNull();
    const config = enviado as unknown as InternalAxiosRequestConfig;
    // Com Content-Type application/json o axios serializa o FormData em JSON e o arquivo some.
    expect(config.data).toBeInstanceOf(FormData);
    expect(String(config.headers.getContentType() ?? '')).not.toContain('application/json');
  });
});
