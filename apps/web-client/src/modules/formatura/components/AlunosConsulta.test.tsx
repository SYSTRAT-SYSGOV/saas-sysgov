import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { formaturaApi, type Configuracao, type Formando } from '../api';
import type { PropsAba } from '../ModuloFormaturaMain';
import { AlunosConsulta } from './AlunosConsulta';

vi.mock('../api', async (original) => ({
  ...(await original<typeof import('../api')>()),
  formaturaApi: { pagamentosDoFormando: vi.fn().mockResolvedValue([]), salvarParticipacao: vi.fn().mockResolvedValue({}) },
}));

const CONFIG: Configuracao = {
  id: 1, ano_letivo: 2026, titulo: 'F', tipo_calculo: 'por_pessoa', valor_base_centavos: 15000,
  valor_pessoa_extra_centavos: 0, convidados_incluidos_padrao: 0, max_parcelas: 3, chaves_pix: [], formas_pagamento: ['pix'], turmas_ids: [1],
};
const aluno = (parcial: Partial<Formando>): Formando => ({
  aluno_id: 7, numero: 1, nome: 'ALICIA', cgm: null, turma_id: 1, turma: '3º A', telefone: null, situacao_aluno: 'ativo',
  participa: false, convidados: 0, convidados_incluidos: 0, convidados_extras: 0, observacoes: null,
  valor_devido_centavos: 0, total_pago_centavos: 0, saldo_devedor_centavos: 0, situacao: 'pendente', ...parcial,
});
const props = (lista: Formando[]): PropsAba => ({
  ano: 2026,
  dados: { ano: 2026, configuracao: CONFIG, formandos: lista, turmasDoAno: [] },
  recarregar: vi.fn().mockResolvedValue(undefined), avisar: vi.fn(), irPara: vi.fn(),
  permissoes: { configurar: true, editarFormandos: true, pagar: true },
});

describe('AlunosConsulta', () => {
  it('tem o interruptor Participa, que grava e abre a ficha', async () => {
    render(<MemoryRouter><AlunosConsulta {...props([aluno({})])} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('switch', { name: 'ALICIA participa' }));
    expect(formaturaApi.salvarParticipacao).toHaveBeenCalledWith(7, 2026, { participa: true });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('tem o seletor de turma', () => {
    render(<MemoryRouter><AlunosConsulta {...props([aluno({})])} /></MemoryRouter>);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
