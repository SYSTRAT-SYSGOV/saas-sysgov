import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HistoricoTimeline } from '../../components/HistoricoTimeline';
import type { SucessaoHistorico } from '../../api';

const evento = (overrides: Partial<SucessaoHistorico>): SucessaoHistorico => ({
  id: overrides.id ?? 1,
  tenant_id: 1,
  sucessao_id: 1,
  de_estado: '',
  para_estado: 'solicitada',
  motivo: { parecer: 'Processo de sucessão aberto' },
  usuario_id: 1,
  usuario: { id: 1, name: 'Ana Servidora' },
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-01T10:00:00Z',
  ...overrides,
});

describe('HistoricoTimeline', () => {
  it('exibe mensagem quando não há histórico', () => {
    render(<HistoricoTimeline historico={[]} />);

    expect(screen.getByText('Nenhum registro histórico disponível.')).toBeInTheDocument();
  });

  it('renderiza os eventos em ordem cronológica (mais antigo primeiro)', () => {
    const eventos = [
      evento({ id: 2, de_estado: 'solicitada', para_estado: 'em_analise', created_at: '2026-09-02T10:00:00Z', motivo: { parecer: 'Documentação inicial conferida.' } }),
      evento({ id: 1, de_estado: '', para_estado: 'solicitada', created_at: '2026-09-01T10:00:00Z' }),
    ];

    render(<HistoricoTimeline historico={eventos} />);

    const nomes = screen.getAllByText(/^(Processo Solicitado|Em Análise)$/);
    expect(nomes[0]).toHaveTextContent('Processo Solicitado');
    expect(nomes[1]).toHaveTextContent('Em Análise');
  });

  it('exibe o parecer/motivo e o usuário responsável pela transição', () => {
    render(
      <HistoricoTimeline
        historico={[
          evento({
            de_estado: 'em_analise',
            para_estado: 'validada',
            motivo: { parecer: 'Documentação completa e conforme.' },
            usuario: { id: 7, name: 'Carlos Analista' },
          }),
        ]}
      />
    );

    expect(screen.getByText('Documentação completa e conforme.')).toBeInTheDocument();
    expect(screen.getByText(/Carlos Analista/)).toBeInTheDocument();
    expect(screen.getByText(/de: Em Análise/)).toBeInTheDocument();
  });
});
