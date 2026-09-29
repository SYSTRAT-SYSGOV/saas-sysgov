import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HerdeirosTable } from '../../components/HerdeirosTable';
import { cemiteriosApi } from '../../api';
import type { Sucessao, SucessaoHerdeiro } from '../../api';

const herdeiroBase: SucessaoHerdeiro = {
  id: 11,
  tenant_id: 1,
  sucessao_id: 1,
  nome: 'Maria da Silva',
  parentesco: 'filho',
  documento: '123.456.789-00',
  ordem: 1,
  direito_representacao: false,
  titular_indicado: true,
  herdeiro_representado_id: null,
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-01T10:00:00Z',
};

const sucessaoComHerdeiro = (herdeiros: SucessaoHerdeiro[]): Sucessao =>
  ({
    id: 1,
    tenant_id: 1,
    park_id: 1,
    concession_id: 101,
    plot_id: 201,
    via: 'inventario_judicial',
    estado: 'em_analise',
    requerente_id: null,
    titular_falecido_id: null,
    data_falecimento: null,
    processo_referencia: 'PROC-1',
    parecer: null,
    lock_version: 1,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    deleted_at: null,
    herdeiros,
    documentos: [],
    historico: [],
  }) as Sucessao;

describe('HerdeirosTable', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('carrega os herdeiros automaticamente ao montar', async () => {
    vi.spyOn(cemiteriosApi, 'sucessao').mockResolvedValue(sucessaoComHerdeiro([herdeiroBase]));

    render(<HerdeirosTable sucessaoId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Maria da Silva')).toBeInTheDocument();
    });
    expect(cemiteriosApi.sucessao).toHaveBeenCalledWith(1);
  });

  it('exibe mensagem quando não há herdeiros', async () => {
    vi.spyOn(cemiteriosApi, 'sucessao').mockResolvedValue(sucessaoComHerdeiro([]));

    render(<HerdeirosTable sucessaoId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum herdeiro qualificado neste processo.')).toBeInTheDocument();
    });
  });

  it('destaca o herdeiro indicado como titular', async () => {
    vi.spyOn(cemiteriosApi, 'sucessao').mockResolvedValue(sucessaoComHerdeiro([herdeiroBase]));

    render(<HerdeirosTable sucessaoId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Titular')).toBeInTheDocument();
    });
  });

  it('remove um herdeiro após confirmação', async () => {
    vi.spyOn(cemiteriosApi, 'sucessao').mockResolvedValue(sucessaoComHerdeiro([herdeiroBase]));
    vi.spyOn(cemiteriosApi, 'removerHerdeiro').mockResolvedValue(undefined as never);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<HerdeirosTable sucessaoId={1} />);

    await waitFor(() => expect(screen.getByText('Maria da Silva')).toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Remover'));

    await waitFor(() => {
      expect(cemiteriosApi.removerHerdeiro).toHaveBeenCalledWith(1, 11);
    });
  });

  it('não remove quando a confirmação é cancelada', async () => {
    vi.spyOn(cemiteriosApi, 'sucessao').mockResolvedValue(sucessaoComHerdeiro([herdeiroBase]));
    vi.spyOn(cemiteriosApi, 'removerHerdeiro').mockResolvedValue(undefined as never);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<HerdeirosTable sucessaoId={1} />);

    await waitFor(() => expect(screen.getByText('Maria da Silva')).toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Remover'));

    await waitFor(() => {
      expect(cemiteriosApi.removerHerdeiro).not.toHaveBeenCalled();
    });
  });

  it('oculta as ações de edição/remoção quando readonly', async () => {
    vi.spyOn(cemiteriosApi, 'sucessao').mockResolvedValue(sucessaoComHerdeiro([herdeiroBase]));

    render(<HerdeirosTable sucessaoId={1} readonly />);

    await waitFor(() => expect(screen.getByText('Maria da Silva')).toBeInTheDocument());
    expect(screen.queryByTitle('Remover')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Editar')).not.toBeInTheDocument();
  });

  it('abre o modal de edição e salva a alteração do herdeiro', async () => {
    vi.spyOn(cemiteriosApi, 'sucessao').mockResolvedValue(sucessaoComHerdeiro([herdeiroBase]));
    vi.spyOn(cemiteriosApi, 'adicionarHerdeiros').mockResolvedValue([{ ...herdeiroBase, nome: 'Maria Editada' }]);

    render(<HerdeirosTable sucessaoId={1} />);

    await waitFor(() => expect(screen.getByText('Maria da Silva')).toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Editar'));

    await waitFor(() => {
      expect(screen.getByText('Editar Herdeiro')).toBeInTheDocument();
    });

    const nomeInput = screen.getByDisplayValue('Maria da Silva');
    fireEvent.change(nomeInput, { target: { value: 'Maria Editada' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));

    await waitFor(() => {
      expect(cemiteriosApi.adicionarHerdeiros).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          herdeiros: expect.arrayContaining([expect.objectContaining({ nome: 'Maria Editada' })]),
        })
      );
    });
  });
});
