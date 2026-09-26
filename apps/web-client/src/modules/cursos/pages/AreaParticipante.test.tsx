import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const cursosApi = vi.hoisted(() => ({
  minhasInscricoes: vi.fn(),
  meusCertificados: vi.fn(),
  listarCatalogo: vi.fn(),
  inscrever: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { MeusCursosPage } from './MeusCursosPage';
import { CatalogoPage } from './CatalogoPage';

const turma = (status = 'aberta') => ({
  id: 1, curso_id: 1, nome: 'Turma 1', data_inicio: '2026-10-01', data_fim: '2026-10-31', status,
  curso: { id: 1, titulo: 'Gestão de Contratos', tipo: 'curso', carga_horaria_minutos: 480, capa_url: null },
});

describe('Área do participante — Meus cursos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra a posição na lista de espera, a frequência e os certificados', async () => {
    cursosApi.minhasInscricoes.mockResolvedValue([
      { id: 5, status: 'lista_espera', posicao_fila: 2, frequencia_apurada: null, frequencia: { aulas: 0, presencas: 0, percentual: 0 }, turma: turma(), certificado: null },
      { id: 6, status: 'concluida', posicao_fila: null, frequencia_apurada: '87.50', frequencia: { aulas: 8, presencas: 7, percentual: 87.5 }, turma: turma('encerrada'), certificado: null },
    ]);
    cursosApi.meusCertificados.mockResolvedValue([
      { id: 9, codigo: 'K7M2-Q9XR-4TWB', curso: 'Gestão de Contratos', carga_horaria: '8 horas', emitido_em: '2026-11-05T10:00:00Z', revogado_em: null },
      { id: 10, codigo: 'AAAA-BBBB-CCCC', curso: 'Outro curso', carga_horaria: '4 horas', emitido_em: '2026-11-05T10:00:00Z', revogado_em: '2026-11-06T10:00:00Z' },
    ]);

    render(<MeusCursosPage onAbrirInscricao={() => undefined} />);

    expect(await screen.findByText('Lista de espera (2º)')).toBeInTheDocument();
    expect(screen.getByText('87,5%')).toBeInTheDocument();
    expect(screen.getByText('K7M2-Q9XR-4TWB')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Baixar PDF/ })).toHaveLength(1);
    expect(screen.getByText('Revogado')).toBeInTheDocument();
    // Só a inscrição ativa em turma aberta pode ser cancelada.
    expect(screen.getAllByRole('button', { name: 'Cancelar inscrição' })).toHaveLength(1);
  });
});

describe('Área do participante — Catálogo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('avisa quando a inscrição cai na lista de espera', async () => {
    cursosApi.listarCatalogo.mockResolvedValue([
      {
        id: 1, tipo: 'curso', titulo: 'Gestão de Contratos', descricao: null, carga_horaria_minutos: 480, capa_url: null, frequencia_minima: 75,
        turmas: [{ id: 11, nome: 'Turma 1', data_inicio: '2026-10-01', data_fim: '2026-10-31', inscricoes_inicio: '2026-09-01', inscricoes_fim: '2026-09-30', vagas: 20, modalidade: 'presencial', local: 'Auditório', aprovacao_manual: false, vagas_restantes: 0, inscricoes_abertas: true, minha_inscricao: null }],
      },
    ]);
    cursosApi.inscrever.mockResolvedValue({ id: 99, status: 'lista_espera' });

    render(<CatalogoPage onVerMeusCursos={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Entrar na fila' }));

    await waitFor(() => expect(cursosApi.inscrever).toHaveBeenCalledWith(11));
    expect(await screen.findByText(/você entrou na lista de espera/)).toBeInTheDocument();
  });
});
