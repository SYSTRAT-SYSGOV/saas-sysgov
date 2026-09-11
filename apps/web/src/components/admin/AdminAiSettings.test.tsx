import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AdminAiSettings } from './AdminAiSettings';
import { adminApi } from '@/modules/admin/api';

vi.mock('@/modules/admin/api', () => ({
  adminApi: {
    getAiSettings: vi.fn(),
    updateAiSettings: vi.fn(),
    testAiSettings: vi.fn(),
  },
}));

describe('AdminAiSettings', () => {
  const mockOnAddToast = vi.fn();

  const settingsBase = {
    enabled: false,
    provider: 'nanogpt',
    baseUrl: 'https://nano-gpt.com/api/v1',
    model: 'deepseek/deepseek-v4-pro-0813',
    maxTokens: 2048,
    apiKeyConfigured: false,
    apiKeyMasked: null,
    updatedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carrega e exibe a configuração salva', async () => {
    vi.mocked(adminApi.getAiSettings).mockResolvedValueOnce(settingsBase);

    render(<AdminAiSettings onAddToast={mockOnAddToast} />);

    expect(await screen.findByText('Configurações de IA')).toBeInTheDocument();
    expect(screen.getByDisplayValue('nanogpt')).toBeInTheDocument();
    expect(screen.getByDisplayValue('deepseek/deepseek-v4-pro-0813')).toBeInTheDocument();
  });

  it('salva a configuração e mostra toast de sucesso', async () => {
    vi.mocked(adminApi.getAiSettings).mockResolvedValueOnce(settingsBase);
    vi.mocked(adminApi.updateAiSettings).mockResolvedValueOnce({
      ...settingsBase,
      enabled: true,
      apiKeyConfigured: true,
      apiKeyMasked: '••••9999',
    });

    render(<AdminAiSettings onAddToast={mockOnAddToast} />);
    await screen.findByText('Configurações de IA');

    fireEvent.click(screen.getByLabelText('Ativar suporte de IA'));
    fireEvent.change(screen.getByPlaceholderText('Cole aqui a chave de API do provedor'), {
      target: { value: 'sk-teste-9999' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(adminApi.updateAiSettings).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true, api_key: 'sk-teste-9999' }),
      );
    });
    expect(mockOnAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('não envia api_key ao salvar quando o campo foi deixado em branco (mantém a chave já salva)', async () => {
    vi.mocked(adminApi.getAiSettings).mockResolvedValueOnce({ ...settingsBase, apiKeyConfigured: true, apiKeyMasked: '••••1234' });
    vi.mocked(adminApi.updateAiSettings).mockResolvedValueOnce({ ...settingsBase, apiKeyConfigured: true, apiKeyMasked: '••••1234' });

    render(<AdminAiSettings onAddToast={mockOnAddToast} />);
    await screen.findByText('Configurações de IA');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(adminApi.updateAiSettings).toHaveBeenCalled());
    const payload = vi.mocked(adminApi.updateAiSettings).mock.calls[0][0];
    expect(payload).not.toHaveProperty('api_key');
  });

  it('testa a conexão e exibe o resultado', async () => {
    vi.mocked(adminApi.getAiSettings).mockResolvedValueOnce(settingsBase);
    vi.mocked(adminApi.testAiSettings).mockResolvedValueOnce({ ok: true, message: 'Conexão bem-sucedida.' });

    render(<AdminAiSettings onAddToast={mockOnAddToast} />);
    await screen.findByText('Configurações de IA');

    fireEvent.click(screen.getByRole('button', { name: 'Testar conexão' }));

    expect(await screen.findByText('Conexão bem-sucedida.')).toBeInTheDocument();
  });

  it('exibe a mensagem de erro quando o teste de conexão falha', async () => {
    vi.mocked(adminApi.getAiSettings).mockResolvedValueOnce(settingsBase);
    vi.mocked(adminApi.testAiSettings).mockResolvedValueOnce({ ok: false, message: 'Informe uma chave de API para testar.' });

    render(<AdminAiSettings onAddToast={mockOnAddToast} />);
    await screen.findByText('Configurações de IA');

    fireEvent.click(screen.getByRole('button', { name: 'Testar conexão' }));

    expect(await screen.findByText('Informe uma chave de API para testar.')).toBeInTheDocument();
  });
});
