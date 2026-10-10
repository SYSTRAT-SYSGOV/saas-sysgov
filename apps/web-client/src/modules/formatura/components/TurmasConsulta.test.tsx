import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Formando } from '../api';
import type { Turma } from '../../escola/api';
import type { PropsAba } from '../ModuloFormaturaMain';
import { TurmasConsulta } from './TurmasConsulta';

const aluno = (aluno_id: number, nome: string, participa: boolean): Formando => ({
  aluno_id, numero: aluno_id, nome, cgm: null, turma_id: 1, turma: '3º A', telefone: null, situacao_aluno: 'ativo',
  participa, convidados: 2, convidados_incluidos: 0, convidados_extras: 2, observacoes: null,
  valor_devido_centavos: 45000, total_pago_centavos: 15000, saldo_devedor_centavos: 30000, situacao: 'parcial',
});

const props: PropsAba = {
  ano: 2026,
  dados: {
    ano: 2026,
    configuracao: { id: 1, ano_letivo: 2026, titulo: 'F', tipo_calculo: 'por_pessoa', valor_base_centavos: 15000, valor_pessoa_extra_centavos: 0,
      convidados_incluidos_padrao: 0, max_parcelas: 3, chaves_pix: [], formas_pagamento: ['pix'], turmas_ids: [1] },
    formandos: [aluno(1, 'ALICIA', true), aluno(2, 'BRUNO', false)],
    turmasDoAno: [{ id: 1, nome: '3º A', ano_letivo: 2026 } as Turma],
  },
  recarregar: vi.fn(), avisar: vi.fn(), irPara: vi.fn(),
  permissoes: { configurar: true, editarFormandos: true, pagar: true },
};

describe('TurmasConsulta', () => {
  it('mostra os participantes da turma ao expandir', () => {
    render(<MemoryRouter><TurmasConsulta {...props} /></MemoryRouter>);
    expect(screen.queryByText('ALICIA')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ver participantes do 3º A/ }));
    expect(screen.getByText('ALICIA')).toBeInTheDocument();
    expect(screen.queryByText('BRUNO')).not.toBeInTheDocument();
  });
});
