import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePessoas } from '../usePessoas';
import { pessoasApi } from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    pessoasApi: {
      ...((actual as Record<string, unknown>).pessoasApi as Record<string, unknown>),
      listar: vi.fn(),
    },
  };
});

describe('usePessoas hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carrega inicialmente pessoas com paginação padrão per_page=20', async () => {
    const mockData = {
      data: [
        {
          id: 1,
          nome: 'Carlos Eduardo',
          cpf_mascarado: '***.123.456-**',
        },
      ],
      current_page: 1,
      last_page: 3,
      total: 50,
    };

    vi.mocked(pessoasApi.listar).mockResolvedValueOnce(mockData as never);

    const { result } = renderHook(() => usePessoas());

    expect(result.current.loading).toBe(true);

    await act(async () => {
      // aguarda resolução da promessa inicial
    });

    expect(pessoasApi.listar).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        per_page: 20,
      })
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.pessoas).toHaveLength(1);
    expect(result.current.pessoas[0]?.nome).toBe('Carlos Eduardo');
    expect(result.current.page).toBe(1);
    expect(result.current.lastPage).toBe(3);
    expect(result.current.total).toBe(50);
  });

  it('aplica debounce de 300ms ao alterar o termo de busca', async () => {
    vi.useFakeTimers();

    const mockData = {
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
    };
    vi.mocked(pessoasApi.listar).mockResolvedValue(mockData as never);

    const { result } = renderHook(() => usePessoas());

    // Chamada inicial
    expect(pessoasApi.listar).toHaveBeenCalledTimes(1);

    // Altera termo de busca
    act(() => {
      result.current.setBusca('Mariana');
    });

    // Antes de 300ms não deve ter disparado nova busca
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(pessoasApi.listar).toHaveBeenCalledTimes(1);

    // Avança os 100ms restantes (total 300ms)
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(pessoasApi.listar).toHaveBeenCalledTimes(2);
    expect(pessoasApi.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        q: 'Mariana',
        page: 1,
        per_page: 20,
      })
    );

    vi.useRealTimers();
  });

  it('trata erros de requisição de forma amigável', async () => {
    vi.mocked(pessoasApi.listar).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePessoas());

    await act(async () => {
      // aguarda rejeição
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.erro).not.toBeNull();
    expect(result.current.error).toBe('Falha de comunicação com o servidor.');
  });

  it('permite navegar entre páginas com goToPage', async () => {
    const mockData = {
      data: [],
      current_page: 2,
      last_page: 5,
      total: 100,
    };
    vi.mocked(pessoasApi.listar).mockResolvedValue(mockData as never);

    const { result } = renderHook(() => usePessoas());

    await act(async () => {
      result.current.goToPage(2);
    });

    expect(pessoasApi.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 2,
        per_page: 20,
      })
    );
  });
});
