import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { formaturaApi, type PagamentoDoAno } from '../api';
import type { PropsAba } from '../ModuloFormaturaMain';
import { PagamentosFormatura } from './PagamentosFormatura';

vi.mock('../api', async (original) => ({
  ...(await original<typeof import('../api')>()),
  formaturaApi: { pagamentos: vi.fn(), estornarPagamento: vi.fn() },
}));

const pagamento = (parcial: Partial<PagamentoDoAno>): PagamentoDoAno => ({
  id: 1, participacao_id: 1, numero_parcela: 1, data_pagamento: '2026-10-05', valor_centavos: 15000, forma_pagamento: 'pix', chave_pix: null, observacao: null,
  aluno_id: 7, aluno_nome: 'ALICIA', turma: '3º A', participa: true, ...parcial,
});

const props = (pagar: boolean): PropsAba => ({
  ano: 2026,
  dados: { ano: 2026, configuracao: null, formandos: [], turmasDoAno: [] },
  recarregar: vi.fn().mockResolvedValue(undefined), avisar: vi.fn(), irPara: vi.fn(),
  permissoes: { configurar: true, editarFormandos: true, pagar },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(formaturaApi.pagamentos).mockResolvedValue([
    pagamento({}),
    pagamento({ id: 2, aluno_id: 8, aluno_nome: 'BRUNO', valor_centavos: 5000, participa: false }),
  ]);
});

describe('PagamentosFormatura', () => {
  it('lista os pagamentos e soma só o recebido dos participantes', async () => {
    render(<MemoryRouter><PagamentosFormatura {...props(true)} /></MemoryRouter>);

    expect(await screen.findByText('ALICIA')).toBeInTheDocument();
    expect(screen.getByText('BRUNO')).toBeInTheDocument();
    expect(screen.getByText('Não participa — fora do recebido')).toBeInTheDocument();
    expect(screen.getByText('Recebido (1 lançamentos de participantes)')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 150,00').length).toBeGreaterThanOrEqual(2); // linha da Alicia e o total
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();
  });

  it('estorna pela ação da linha, depois de confirmar', async () => {
    vi.mocked(formaturaApi.estornarPagamento).mockResolvedValue(undefined as never);
    render(<MemoryRouter><PagamentosFormatura {...props(true)} /></MemoryRouter>);
    await screen.findByText('ALICIA');

    fireEvent.click(screen.getAllByRole('button', { name: 'Estornar' })[0]);
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Estornar' }));

    await waitFor(() => expect(formaturaApi.estornarPagamento).toHaveBeenCalledWith(1));
  });

  it('sem permissão de pagar não há ação de estorno', async () => {
    render(<MemoryRouter><PagamentosFormatura {...props(false)} /></MemoryRouter>);
    await screen.findByText('ALICIA');
    expect(screen.queryByRole('button', { name: 'Estornar' })).not.toBeInTheDocument();
  });
});
