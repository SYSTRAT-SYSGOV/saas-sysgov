import { describe, expect, it, vi } from 'vitest';
import { formaturaApi } from '../api';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Configuracao, Formando } from '../api';
import type { PropsAba } from '../ModuloFormaturaMain';
import { FormandosFormatura } from './FormandosFormatura';

vi.mock('../api', async (original) => ({
  ...(await original<typeof import('../api')>()),
  formaturaApi: { pagamentosDoFormando: vi.fn().mockResolvedValue([]), salvarParticipacao: vi.fn() },
}));

const formando = (parcial: Partial<Formando> = {}): Formando => ({
  aluno_id: 7, numero: 1, nome: 'ALICIA', cgm: null, turma_id: 1, turma: '3º A', telefone: null, situacao_aluno: 'ativo', participa: true, convidados: 2,
  convidados_incluidos: 2, convidados_extras: 0, observacoes: null, valor_devido_centavos: 45000,
  total_pago_centavos: 0, saldo_devedor_centavos: 45000, situacao: 'pendente', ...parcial,
});

const CONFIG: Configuracao = {
  id: 1, ano_letivo: 2026, titulo: 'F', tipo_calculo: 'fixo_mais_convidados', valor_base_centavos: 50000,
  valor_pessoa_extra_centavos: 8000, convidados_incluidos_padrao: 0, max_parcelas: 3, chaves_pix: [], formas_pagamento: ['pix'], turmas_ids: [1],
};

const props = (f: Formando | Formando[]): PropsAba => ({
  ano: 2026,
  dados: { ano: 2026, configuracao: CONFIG, formandos: Array.isArray(f) ? f : [f], turmasDoAno: [] },
  recarregar: vi.fn().mockResolvedValue(undefined),
  avisar: vi.fn(),
  permissoes: { configurar: true, editarFormandos: true, pagar: true },
  irPara: vi.fn(),
});

describe('FormandosFormatura', () => {
  it('a ficha aberta acompanha os totais recarregados do formando', async () => {
    const { rerender } = render(<MemoryRouter><FormandosFormatura {...props(formando())} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Ficha' }));
    const ficha = await screen.findByRole('dialog');
    expect(within(ficha).getAllByText('R$ 450,00')).toHaveLength(2); // devido e saldo

    const pago = formando({ total_pago_centavos: 15050, saldo_devedor_centavos: 29950, situacao: 'parcial' });
    rerender(<MemoryRouter><FormandosFormatura {...props(pago)} /></MemoryRouter>);

    expect(within(screen.getByRole('dialog')).getByText('R$ 150,50')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('R$ 299,50')).toBeInTheDocument();
  });

  it('trava o interruptor enquanto a participação é gravada (clique duplo = uma gravação)', async () => {
    let concluir: () => void = () => {};
    vi.mocked(formaturaApi.salvarParticipacao).mockImplementation(() => new Promise((r) => { concluir = () => r({} as Formando); }));
    render(<MemoryRouter><FormandosFormatura {...props(formando({ participa: false }))} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('switch', { name: 'Somente participantes' }));
    const chave = screen.getByRole('switch', { name: 'ALICIA participa' });
    fireEvent.click(chave);
    fireEvent.click(chave);

    expect(formaturaApi.salvarParticipacao).toHaveBeenCalledTimes(1);
    expect(chave).toBeDisabled();
    concluir();
    await waitFor(() => expect(chave).not.toBeDisabled());
  });

  it('aluno transferido aparece identificado e não pode ser marcado', () => {
    render(<MemoryRouter><FormandosFormatura {...props(formando({ participa: false, situacao_aluno: 'transferido' }))} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('switch', { name: 'Somente participantes' }));
    expect(screen.getByText('Transferido')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'ALICIA participa' })).toBeDisabled();
  });

  it('por padrão mostra só os participantes', () => {
    render(<MemoryRouter><FormandosFormatura {...props([formando(), formando({ aluno_id: 8, nome: 'BRUNO', participa: false })])} /></MemoryRouter>);
    expect(screen.getByText('ALICIA')).toBeInTheDocument();
    expect(screen.queryByText('BRUNO')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Somente participantes' }));
    expect(screen.getByText('BRUNO')).toBeInTheDocument();
  });

  it('ligar Participa grava e abre a ficha', async () => {
    vi.mocked(formaturaApi.salvarParticipacao).mockResolvedValue({} as Formando);
    render(<MemoryRouter><FormandosFormatura {...props(formando({ participa: false }))} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('switch', { name: 'Somente participantes' }));
    fireEvent.click(screen.getByRole('switch', { name: 'ALICIA participa' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('a ficha mostra a prévia do devido e a simulação de parcelas do saldo', async () => {
    render(<MemoryRouter><FormandosFormatura {...props(formando({ convidados: 0, valor_devido_centavos: 50000, saldo_devedor_centavos: 50000 }))} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Ficha' }));
    const ficha = await screen.findByRole('dialog');
    fireEvent.change(within(ficha).getByLabelText('Convidados'), { target: { value: '3' } });
    expect(within(ficha).getAllByText('R$ 740,00')).toHaveLength(2); // devido (500 + 3 × 80) e saldo
    expect(within(ficha).getByText(/2× R\$ 246,66/)).toBeInTheDocument(); // saldo 740 em 3 parcelas
    expect(within(ficha).getByText(/1× R\$ 246,68/)).toBeInTheDocument();
  });
});
