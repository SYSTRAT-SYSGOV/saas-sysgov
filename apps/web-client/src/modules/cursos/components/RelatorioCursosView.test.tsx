import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const cursosApi = vi.hoisted(() => ({
  listarCursos: vi.fn(),
  getRelatorioCursos: vi.fn(),
  exportarRelatorioCursos: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { RelatorioCursosView } from './RelatorioCursosView';

const anoAtual = new Date().getFullYear();

const relatorioComCurso = {
  cursos: [
    {
      curso_id: 1, titulo: 'Gestão de Contratos', tipo: 'curso' as const, turmas: 2, inscricoes: 10, concluidos: 8, nao_concluidos: 2,
      taxa_conclusao: 80, frequencia_media: 90, nota_media: 8.2, certificados_emitidos: 8, horas_certificadas_minutos: 3840, turmas_detalhe: [],
    },
  ],
  totais: { turmas: 2, inscricoes: 10, concluidos: 8, nao_concluidos: 2, taxa_conclusao: 80, frequencia_media: 90, nota_media: 8.2, horas_certificadas_minutos: 3840, certificados_emitidos: 8 },
};

describe('RelatorioCursosView (aba Relatórios — cursos por período)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cursosApi.listarCursos.mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });
  });

  it('carrega o relatório do ano corrente por padrão e mostra os totais e a tabela', async () => {
    cursosApi.getRelatorioCursos.mockResolvedValue(relatorioComCurso);

    render(<RelatorioCursosView />);

    await screen.findByText('Gestão de Contratos');
    expect(cursosApi.getRelatorioCursos).toHaveBeenCalledWith({ inicio: `${anoAtual}-01-01`, fim: `${anoAtual}-12-31` });
    expect(screen.getByText('Turmas no período').closest('div')).toHaveTextContent('2');
  });

  it('mudar o filtro de período recarrega o relatório com as novas datas', async () => {
    cursosApi.getRelatorioCursos.mockResolvedValue(relatorioComCurso);
    render(<RelatorioCursosView />);
    await screen.findByText('Gestão de Contratos');

    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2025-03-01' } });
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2025-03-31' } });

    await waitFor(() => expect(cursosApi.getRelatorioCursos).toHaveBeenLastCalledWith({ inicio: '2025-03-01', fim: '2025-03-31' }));
  });

  it('período sem turmas mostra o estado vazio da tabela', async () => {
    cursosApi.getRelatorioCursos.mockResolvedValue({ cursos: [], totais: { turmas: 0, inscricoes: 0, concluidos: 0, nao_concluidos: 0, taxa_conclusao: null, frequencia_media: null, nota_media: null, horas_certificadas_minutos: 0, certificados_emitidos: 0 } });

    render(<RelatorioCursosView />);

    expect(await screen.findByText('Nenhum curso com turma no período.')).toBeInTheDocument();
  });

  it('erro ao carregar mostra a mensagem', async () => {
    cursosApi.getRelatorioCursos.mockRejectedValue(Object.assign(new Error('500'), { response: { status: 500, data: { error: 'Falha ao gerar o relatório.' } } }));

    render(<RelatorioCursosView />);

    expect(await screen.findByText('Falha ao gerar o relatório.')).toBeInTheDocument();
  });
});
