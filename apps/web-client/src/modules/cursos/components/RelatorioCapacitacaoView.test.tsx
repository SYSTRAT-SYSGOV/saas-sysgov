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
  listarUnidadesRelatorio: vi.fn(),
  getRelatorioCapacitacao: vi.fn(),
  exportarRelatorioCapacitacao: vi.fn(),
  getCapacitacaoServidor: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { RelatorioCapacitacaoView } from './RelatorioCapacitacaoView';

const pagina1 = {
  data: [
    { participante_id: 1, nome: 'Ana Souza', email: 'ana@teste.gov.br', cursos_concluidos: 3, horas_capacitacao_minutos: 480, cursos_em_andamento: 1, ultima_conclusao: '2025-03-01T10:00:00Z', unidades: ['Secretaria de Educação'] },
  ],
  current_page: 1,
  last_page: 2,
  total: 26,
};

describe('RelatorioCapacitacaoView (aba Relatórios — capacitação por servidor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cursosApi.listarCursos.mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });
    cursosApi.listarUnidadesRelatorio.mockResolvedValue([]);
    cursosApi.getRelatorioCapacitacao.mockResolvedValue(pagina1);
  });

  it('carrega a lista com os filtros e a ordenação padrão', async () => {
    render(<RelatorioCapacitacaoView />);

    await screen.findByText('Ana Souza');
    expect(cursosApi.getRelatorioCapacitacao).toHaveBeenCalledWith({ ordenar_por: 'nome', direcao: 'asc', pagina: 1, por_pagina: 25 });
    expect(screen.getByText('Secretaria de Educação')).toBeInTheDocument();
  });

  it('mudar o filtro de período recarrega com os novos filtros e volta pra página 1', async () => {
    render(<RelatorioCapacitacaoView />);
    await screen.findByText('Ana Souza');

    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2025-01-01' } });
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2025-06-30' } });

    await waitFor(() =>
      expect(cursosApi.getRelatorioCapacitacao).toHaveBeenLastCalledWith({ inicio: '2025-01-01', fim: '2025-06-30', ordenar_por: 'nome', direcao: 'asc', pagina: 1, por_pagina: 25 }),
    );
  });

  it('clicar na coluna "Horas de capacitação" ordena por horas; clicar de novo inverte a direção', async () => {
    render(<RelatorioCapacitacaoView />);
    await screen.findByText('Ana Souza');

    fireEvent.click(screen.getByRole('button', { name: /Horas de capacitação/ }));
    await waitFor(() => expect(cursosApi.getRelatorioCapacitacao).toHaveBeenLastCalledWith({ ordenar_por: 'horas', direcao: 'asc', pagina: 1, por_pagina: 25 }));

    fireEvent.click(screen.getByRole('button', { name: /Horas de capacitação/ }));
    await waitFor(() => expect(cursosApi.getRelatorioCapacitacao).toHaveBeenLastCalledWith({ ordenar_por: 'horas', direcao: 'desc', pagina: 1, por_pagina: 25 }));
  });

  it('paginação: "Próxima" busca a página 2', async () => {
    render(<RelatorioCapacitacaoView />);
    await screen.findByText('Ana Souza');

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    await waitFor(() => expect(cursosApi.getRelatorioCapacitacao).toHaveBeenLastCalledWith({ ordenar_por: 'nome', direcao: 'asc', pagina: 2, por_pagina: 25 }));
  });

  it('clicar num servidor abre o detalhe com os cursos e certificados', async () => {
    cursosApi.getCapacitacaoServidor.mockResolvedValue({
      participante_id: 1,
      nome: 'Ana Souza',
      email: 'ana@teste.gov.br',
      cursos: [
        { curso_titulo: 'Gestão de Contratos', carga_horaria_minutos: 480, concluida_em: '2025-03-01T10:00:00Z', certificado_codigo: 'CERT-1', certificado_valido: true },
        { curso_titulo: 'LGPD na Prática', carga_horaria_minutos: 120, concluida_em: '2025-02-01T10:00:00Z', certificado_codigo: 'CERT-2', certificado_valido: false },
      ],
    });

    render(<RelatorioCapacitacaoView />);
    fireEvent.click(await screen.findByText('Ana Souza'));

    expect(await screen.findByText('Gestão de Contratos')).toBeInTheDocument();
    expect(screen.getByText('LGPD na Prática')).toBeInTheDocument();
    expect(screen.getByText(/CERT-2/)).toHaveTextContent('revogado');
    expect(cursosApi.getCapacitacaoServidor).toHaveBeenCalledWith(1);
  });

  it('sem servidores para os filtros mostra o estado vazio', async () => {
    cursosApi.getRelatorioCapacitacao.mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });

    render(<RelatorioCapacitacaoView />);

    expect(await screen.findByText('Nenhum servidor encontrado para os filtros.')).toBeInTheDocument();
  });
});
