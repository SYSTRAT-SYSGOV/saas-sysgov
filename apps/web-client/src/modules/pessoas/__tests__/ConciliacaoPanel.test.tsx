import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConciliacaoPanel } from '../ConciliacaoPanel';
import { pessoasApi, type PessoaDivergencia } from '../api';

vi.mock('../api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api')>();
  return {
    ...original,
    pessoasApi: { ...original.pessoasApi, adocao: vi.fn(), listarDivergencias: vi.fn(), resolverDivergencia: vi.fn() },
  };
});

const divergencia: PessoaDivergencia = {
  id: 3, pessoa_id: 1, pessoa_nome: 'Ana Lima', modulo: 'escola', tabela: 'escola_alunos', registro_id: 10,
  campo: 'nome', valor_modulo: 'Ana de Lima', valor_mdm: 'Ana Lima', estado: 'aberta', decisao: null, resolvida_em: null,
};

const paginado = <T,>(data: T[]) => ({ data, current_page: 1, last_page: 1, total: data.length });

describe('ConciliacaoPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pessoasApi.adocao).mockResolvedValue({
      modulos: [{ modulo: 'escola', tabela: 'escola_alunos', total: 400, vinculados: 390, sem_vinculo: 10, documento_pendente: 380, divergencias_abertas: 1 }],
      totais: { total: 400, vinculados: 390, sem_vinculo: 10, documento_pendente: 380, divergencias_abertas: 1 },
    });
    vi.mocked(pessoasApi.listarDivergencias).mockResolvedValue(paginado([divergencia]));
  });

  it('mostra a adoção por módulo apenas com totais', async () => {
    render(<ConciliacaoPanel />);

    expect(await screen.findByText('400')).toBeInTheDocument();
    expect(screen.getByText('390')).toBeInTheDocument();
    expect(screen.getByText('380')).toBeInTheDocument();
  });

  it('lista a divergência com os dois valores', async () => {
    render(<ConciliacaoPanel />);

    expect(await screen.findByText('Ana de Lima')).toBeInTheDocument();
    expect(screen.getByText('Ana Lima', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Nome')).toBeInTheDocument();
  });

  it('manter o cadastro central resolve na hora', async () => {
    vi.mocked(pessoasApi.resolverDivergencia).mockResolvedValue({ ...divergencia, estado: 'resolvida', decisao: 'mdm' });
    render(<ConciliacaoPanel />);

    fireEvent.click(await screen.findByRole('button', { name: /Manter cadastro central/i }));

    await waitFor(() => expect(pessoasApi.resolverDivergencia).toHaveBeenCalledWith(3, 'mdm'));
  });

  it('usar o valor do módulo pede confirmação antes de alterar a pessoa', async () => {
    vi.mocked(pessoasApi.resolverDivergencia).mockResolvedValue({ ...divergencia, estado: 'resolvida', decisao: 'modulo' });
    render(<ConciliacaoPanel />);

    fireEvent.click(await screen.findByRole('button', { name: /Usar valor do módulo/i }));
    expect(pessoasApi.resolverDivergencia).not.toHaveBeenCalled();
    expect(screen.getByText(/Atualizar a pessoa com o valor do módulo/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(pessoasApi.resolverDivergencia).toHaveBeenCalledWith(3, 'modulo'));
  });

  it('sem divergências nem módulos mostra os estados vazios', async () => {
    vi.mocked(pessoasApi.adocao).mockResolvedValue({ modulos: [], totais: { total: 0, vinculados: 0, sem_vinculo: 0, documento_pendente: 0, divergencias_abertas: 0 } });
    vi.mocked(pessoasApi.listarDivergencias).mockResolvedValue(paginado([]));
    render(<ConciliacaoPanel />);

    expect(await screen.findByText('Nenhum módulo registrou conciliação ainda.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma divergência aberta.')).toBeInTheDocument();
  });
});
