import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const cursosApi = vi.hoisted(() => ({
  getTurma: vi.fn(),
  listarInscritos: vi.fn(),
  getRelatorioTurma: vi.fn(),
  exportarRelatorioTurma: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));
vi.mock('@/core/rbac/useCan', () => ({ useCan: () => ({ can: () => true }) }));

import type { RelatorioTurma, TurmaDetalhe } from '@sysgov/sdk';
import { TurmaDetalhePage } from './TurmaDetalhePage';

const turma = (extra: Partial<TurmaDetalhe> = {}): TurmaDetalhe => ({
  id: 1,
  curso_id: 1,
  nome: 'Turma 1',
  data_inicio: '2025-01-10',
  data_fim: '2025-01-20',
  inscricoes_inicio: '2025-01-01T00:00:00Z',
  inscricoes_fim: '2025-01-09T00:00:00Z',
  vagas: 10,
  modalidade: 'presencial',
  local: 'Auditório',
  link: null,
  aprovacao_manual: false,
  status: 'aberta',
  encerrada_em: null,
  curso: {
    id: 1, tipo: 'curso', titulo: 'Gestão de Contratos', descricao: null, carga_horaria_minutos: 480, capa_path: null, capa_url: null,
    status: 'publicado', frequencia_minima: 75, nota_minima: null, modelo_certificado_id: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
  },
  agendamentos: [],
  instrutores: [{ id: 2, name: 'Helena Duarte' }],
  vagas_ocupadas: 1,
  vagas_restantes: 9,
  lista_espera: 0,
  ...extra,
});

const relatorio = (extra: Partial<RelatorioTurma> = {}): RelatorioTurma => ({
  resumo: {
    por_situacao: { pendente: 0, confirmada: 1, lista_espera: 0, cancelada: 0, concluida: 0, nao_concluida: 0 },
    vagas_ocupadas: 1,
    vagas: 10,
    frequencia_media: null,
    nota_media: null,
    taxa_conclusao: null,
    certificados_emitidos: 0,
  },
  inscritos: [
    { id: 1, participante_id: 1, nome: 'Ana Souza', email: 'ana@teste.gov.br', status: 'confirmada', status_label: 'Confirmada', inscrito_em: '2025-01-02T00:00:00Z', posicao_fila: null, frequencia: { aulas: 0, presencas: 0, percentual: 0 }, nota: null, resultado: 'em andamento' },
  ],
  ...extra,
});

describe('Aba Resumo da turma (relatório)', () => {
  it('turma aberta: mostra os indicadores sem taxa de conclusão e a tabela sem resultado fechado', async () => {
    cursosApi.getTurma.mockResolvedValue(turma());
    cursosApi.listarInscritos.mockResolvedValue([]);
    cursosApi.getRelatorioTurma.mockResolvedValue(relatorio());

    render(<TurmaDetalhePage turmaId={1} onVoltar={() => {}} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Resumo' }));

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('em andamento')).toBeInTheDocument();
    expect(screen.getByText('Taxa de conclusão')).toBeInTheDocument();
    // Sem valor (turma aberta): o indicador mostra "—".
    const cardTaxa = screen.getByText('Taxa de conclusão').closest('div')?.parentElement;
    expect(cardTaxa).toHaveTextContent('—');
    expect(screen.getByRole('button', { name: /Exportar CSV/ })).toBeInTheDocument();
  });

  it('turma encerrada: mostra taxa de conclusão, frequência e nota médias, e certificados emitidos', async () => {
    cursosApi.getTurma.mockResolvedValue(turma({ status: 'encerrada', encerrada_em: '2025-02-01T00:00:00Z' }));
    cursosApi.listarInscritos.mockResolvedValue([]);
    cursosApi.getRelatorioTurma.mockResolvedValue(
      relatorio({
        resumo: {
          por_situacao: { pendente: 0, confirmada: 0, lista_espera: 0, cancelada: 0, concluida: 1, nao_concluida: 0 },
          vagas_ocupadas: 1,
          vagas: 10,
          frequencia_media: 92.5,
          nota_media: 8.5,
          taxa_conclusao: 100,
          certificados_emitidos: 1,
        },
        inscritos: [
          { id: 1, participante_id: 1, nome: 'Ana Souza', email: 'ana@teste.gov.br', status: 'concluida', status_label: 'Concluída', inscrito_em: '2025-01-02T00:00:00Z', posicao_fila: null, frequencia: { aulas: 4, presencas: 4, percentual: 100 }, nota: 8.5, resultado: 'concluída' },
        ],
      }),
    );

    render(<TurmaDetalhePage turmaId={1} onVoltar={() => {}} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Resumo' }));

    expect(await screen.findByText('concluída')).toBeInTheDocument();
    const cardTaxa = screen.getByText('Taxa de conclusão').closest('div')?.parentElement;
    expect(cardTaxa).toHaveTextContent('100%');
    const cardCertificados = screen.getByText('Certificados emitidos').closest('div')?.parentElement;
    expect(cardCertificados).toHaveTextContent('1');
  });

  it('exporta o CSV do relatório da turma', async () => {
    cursosApi.getTurma.mockResolvedValue(turma());
    cursosApi.listarInscritos.mockResolvedValue([]);
    cursosApi.getRelatorioTurma.mockResolvedValue(relatorio());
    cursosApi.exportarRelatorioTurma.mockResolvedValue(new Blob(['csv']));
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();

    render(<TurmaDetalhePage turmaId={1} onVoltar={() => {}} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Resumo' }));
    fireEvent.click(await screen.findByRole('button', { name: /Exportar CSV/ }));

    await screen.findByText('Ana Souza');
    expect(cursosApi.exportarRelatorioTurma).toHaveBeenCalledWith(1);
  });
});
