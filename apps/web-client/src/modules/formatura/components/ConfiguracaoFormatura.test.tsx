import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Configuracao } from '../api';
import type { PropsAba } from '../ModuloFormaturaMain';
import { ConfiguracaoFormatura } from './ConfiguracaoFormatura';

const config = (tipo: Configuracao['tipo_calculo']): Configuracao => ({
  id: 1, ano_letivo: 2026, titulo: 'Formatura 2026', tipo_calculo: tipo, valor_base_centavos: 50000,
  valor_pessoa_extra_centavos: 8000, convidados_incluidos_padrao: 0, max_parcelas: 10, chaves_pix: [],
  formas_pagamento: ['pix'], turmas_ids: [],
});

const props = (c: Configuracao): PropsAba => ({
  ano: 2026,
  dados: { ano: 2026, configuracao: c, formandos: [], turmasDoAno: [] },
  recarregar: vi.fn(), avisar: vi.fn(), irPara: vi.fn(),
  permissoes: { configurar: true, editarFormandos: true, pagar: true },
});

describe('ConfiguracaoFormatura', () => {
  it('valor fixo + convidados mostra o valor fixo e o valor por convidado', () => {
    render(<ConfiguracaoFormatura {...props(config('fixo_mais_convidados'))} />);
    expect(screen.getByLabelText('Valor fixo (R$)')).toHaveValue('500,00');
    expect(screen.getByLabelText('Valor por convidado (R$)')).toHaveValue('80,00');
    expect(screen.queryByLabelText(/Convidados incluídos/)).not.toBeInTheDocument();
  });

  it('por pessoa mostra só o valor por pessoa', () => {
    render(<ConfiguracaoFormatura {...props(config('por_pessoa'))} />);
    expect(screen.getByLabelText('Valor por pessoa (R$)')).toHaveValue('500,00');
    expect(screen.queryByLabelText('Valor por convidado (R$)')).not.toBeInTheDocument();
  });
});
