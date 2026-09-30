import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CatalogoCurso } from '@sysgov/sdk';

const cursosApi = vi.hoisted(() => ({
  listarCatalogo: vi.fn(),
  listarCamposInscricao: vi.fn(),
  inscrever: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { CatalogoPage } from './CatalogoPage';

const curso = (extra: Partial<CatalogoCurso> = {}): CatalogoCurso => ({
  id: 2,
  tipo: 'curso',
  titulo: 'Gestão de Contratos',
  descricao: null,
  carga_horaria_minutos: 480,
  capa_url: null,
  frequencia_minima: 75,
  turmas: [
    {
      id: 7,
      nome: 'Turma 1',
      data_inicio: '2026-01-10',
      data_fim: '2026-01-20',
      inscricoes_inicio: '2026-01-01T00:00:00Z',
      inscricoes_fim: '2026-01-09T00:00:00Z',
      vagas: 10,
      modalidade: 'presencial',
      local: 'Auditório',
      aprovacao_manual: false,
      vagas_restantes: 5,
      inscricoes_abertas: true,
      minha_inscricao: null,
    },
  ],
  ...extra,
});

describe('CatalogoPage — tarefa 6.5 (inscrição com campos configurados)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sem campos configurados: confirma a inscrição direto no modal', async () => {
    cursosApi.listarCatalogo.mockResolvedValue([curso()]);
    cursosApi.listarCamposInscricao.mockResolvedValue([]);
    cursosApi.inscrever.mockResolvedValue({ id: 1, status: 'confirmada' });

    render(<CatalogoPage onVerMeusCursos={() => undefined} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Inscrever-me' }));
    expect(cursosApi.listarCamposInscricao).toHaveBeenCalledWith(2);
    expect(await screen.findByText('Nenhuma informação adicional é necessária para esta inscrição.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscrição' }));

    expect(await screen.findByText('Inscrição confirmada!')).toBeInTheDocument();
    expect(cursosApi.inscrever).toHaveBeenCalledWith(7, []);
  });

  it('curso com campo obrigatório: recusa sem resposta e envia ao preencher', async () => {
    cursosApi.listarCatalogo.mockResolvedValue([curso()]);
    cursosApi.listarCamposInscricao.mockResolvedValue([
      { id: 4, curso_id: 2, rotulo: 'Unidade de lotação', tipo: 'texto', obrigatorio: true, opcoes: null, ordem: 1, ativo: true },
    ]);
    cursosApi.inscrever.mockResolvedValue({ id: 1, status: 'pendente' });

    render(<CatalogoPage onVerMeusCursos={() => undefined} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Inscrever-me' }));
    expect(await screen.findByLabelText('Unidade de lotação (obrigatório)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscrição' }));
    expect(await screen.findByText('O campo "Unidade de lotação" é obrigatório.')).toBeInTheDocument();
    expect(cursosApi.inscrever).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Unidade de lotação (obrigatório)'), { target: { value: 'Secretaria de Obras' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscrição' }));

    await waitFor(() => expect(cursosApi.inscrever).toHaveBeenCalledWith(7, [{ campo_id: 4, valor: 'Secretaria de Obras' }]));
    expect(await screen.findByText('Inscrição enviada: aguardando aprovação do Administrador.')).toBeInTheDocument();
  });

  it('turma lotada: o botão convida a entrar na fila', async () => {
    cursosApi.listarCatalogo.mockResolvedValue([curso({ turmas: [{ ...curso().turmas[0], vagas_restantes: 0 }] })]);

    render(<CatalogoPage onVerMeusCursos={() => undefined} />);

    expect(await screen.findByRole('button', { name: 'Entrar na fila' })).toBeInTheDocument();
  });
});
