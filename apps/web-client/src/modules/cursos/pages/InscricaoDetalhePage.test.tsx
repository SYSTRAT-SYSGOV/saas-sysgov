import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { InscricaoDetalhe } from '@sysgov/sdk';

const cursosApi = vi.hoisted(() => ({
  getInscricao: vi.fn(),
  getRespostasInscricao: vi.fn(),
  getConteudoInscricao: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { InscricaoDetalhePage } from './InscricaoDetalhePage';

const inscricao = (): InscricaoDetalhe => ({
  id: 1,
  turma_id: 7,
  participante_id: 3,
  status: 'confirmada',
  aprovada_em: null,
  cancelada_em: null,
  motivo_cancelamento: null,
  frequencia_apurada: null,
  nota_apurada: null,
  concluida_em: null,
  created_at: '2026-01-02T00:00:00Z',
  certificado: null,
  posicao_fila: null,
  frequencia: { aulas: 4, presencas: 3, percentual: 75 },
  nota: null,
  participante: { id: 3, nome: 'Ana Souza', email: 'ana@teste.gov.br' },
  aulas: [],
  turma: {
    id: 7, curso_id: 2, nome: 'Turma 1', data_inicio: '2026-01-10', data_fim: '2026-01-20',
    inscricoes_inicio: '2026-01-01T00:00:00Z', inscricoes_fim: '2026-01-09T00:00:00Z', vagas: 10,
    modalidade: 'presencial', local: 'Auditório', link: null, aprovacao_manual: false, aceita_externos: false,
    status: 'aberta', encerrada_em: null,
    curso: {
      id: 2, tipo: 'curso', titulo: 'Gestão de Contratos', slug: 'gestao', descricao: null, texto_publico: null,
      carga_horaria_minutos: 480, capa_path: null, capa_url: null, status: 'publicado', frequencia_minima: 75,
      nota_minima: null, modelo_certificado_id: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
  },
});

describe('InscricaoDetalhePage — tarefa 6.5 (respostas do formulário na tela da inscrição)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sem respostas, não mostra a seção do formulário', async () => {
    cursosApi.getInscricao.mockResolvedValue(inscricao());
    cursosApi.getRespostasInscricao.mockResolvedValue([]);
    cursosApi.getConteudoInscricao.mockResolvedValue({ inscricao_id: 1, turma_id: 7, status: 'confirmada', acesso: true, nota: null, nota_tipo: null, materiais: [], avaliacoes: [] });

    render(<InscricaoDetalhePage inscricaoId={1} onVoltar={() => undefined} onAbrirTentativa={() => undefined} />);

    await screen.findByText('Gestão de Contratos');
    expect(screen.queryByText('Respostas do formulário de inscrição')).not.toBeInTheDocument();
  });

  it('com respostas, mostra rótulo e valor formatado por tipo', async () => {
    cursosApi.getInscricao.mockResolvedValue(inscricao());
    cursosApi.getRespostasInscricao.mockResolvedValue([
      { id: 1, campo_id: 10, rotulo: 'Unidade de lotação', tipo: 'texto', valor: 'Secretaria de Obras' },
      { id: 2, campo_id: 11, rotulo: 'Data de admissão', tipo: 'data', valor: '2020-05-01' },
      { id: 3, campo_id: 12, rotulo: 'Aceita contato por e-mail', tipo: 'caixa_marcacao', valor: 'sim' },
      { id: 4, campo_id: 13, rotulo: 'Comprovante não enviado', tipo: 'texto', valor: null },
    ]);
    cursosApi.getConteudoInscricao.mockResolvedValue({ inscricao_id: 1, turma_id: 7, status: 'confirmada', acesso: true, nota: null, nota_tipo: null, materiais: [], avaliacoes: [] });

    render(<InscricaoDetalhePage inscricaoId={1} onVoltar={() => undefined} onAbrirTentativa={() => undefined} />);

    expect(await screen.findByText('Respostas do formulário de inscrição')).toBeInTheDocument();
    expect(screen.getByText('Unidade de lotação')).toBeInTheDocument();
    expect(screen.getByText('Secretaria de Obras')).toBeInTheDocument();
    expect(screen.getByText('01/05/2020')).toBeInTheDocument();
    expect(screen.getByText('Sim')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
