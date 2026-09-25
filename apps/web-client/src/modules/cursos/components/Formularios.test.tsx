import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// O Switch (Radix) mede o próprio tamanho com ResizeObserver, que o jsdom não tem.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const cursosApi = vi.hoisted(() => ({
  criarCurso: vi.fn(),
  atualizarCurso: vi.fn(),
  listarCursos: vi.fn(),
  atualizarFormacao: vi.fn(),
  criarFormacao: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { CursoFormModal } from './CursoFormModal';
import { FormacaoFormModal } from '../pages/FormacoesPage';

describe('CursoFormModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia a carga horária em minutos (horas × 60 + minutos)', async () => {
    cursosApi.criarCurso.mockResolvedValue({ id: 7 });
    const onSalvo = vi.fn();
    render(<CursoFormModal open onClose={() => undefined} onSalvo={onSalvo} />);

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Gestão de Contratos' } });
    fireEvent.change(screen.getByLabelText('Carga horária (horas)'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Minutos'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalledWith({ id: 7 }));
    expect(cursosApi.criarCurso).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Gestão de Contratos', carga_horaria_minutos: 510, frequencia_minima: 75, tipo: 'curso' }));
  });

  it('envia a nota mínima como número e recusa fora da escala de 0 a 10', async () => {
    cursosApi.criarCurso.mockResolvedValue({ id: 8 });
    const onSalvo = vi.fn();
    render(<CursoFormModal open onClose={() => undefined} onSalvo={onSalvo} />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Com nota' } });
    fireEvent.change(screen.getByLabelText('Carga horária (horas)'), { target: { value: '4' } });

    fireEvent.change(screen.getByLabelText('Nota mínima (0 a 10)'), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    expect(await screen.findByText('A nota mínima deve estar na escala de 0 a 10.')).toBeInTheDocument();
    expect(cursosApi.criarCurso).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Nota mínima (0 a 10)'), { target: { value: '7.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(cursosApi.criarCurso).toHaveBeenCalledWith(expect.objectContaining({ nota_minima: 7.5 }));
  });

  it('sem nota mínima envia nulo; evento não tem o campo', async () => {
    cursosApi.criarCurso.mockResolvedValue({ id: 9 });
    render(<CursoFormModal open onClose={() => undefined} onSalvo={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Sem nota' } });
    fireEvent.change(screen.getByLabelText('Carga horária (horas)'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(cursosApi.criarCurso).toHaveBeenCalledWith(expect.objectContaining({ nota_minima: null })));
  });

  it('edição de curso carrega a nota mínima existente', () => {
    render(<CursoFormModal open curso={{ id: 1, tipo: 'curso', titulo: 'C', descricao: null, carga_horaria_minutos: 60, frequencia_minima: 75, nota_minima: '7.00' } as unknown as import('@sysgov/sdk').Curso} onClose={() => undefined} onSalvo={() => undefined} />);

    expect(screen.getByLabelText('Nota mínima (0 a 10)')).toHaveValue(7);
  });

  it('não envia sem carga horária', async () => {
    render(<CursoFormModal open onClose={() => undefined} onSalvo={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Sem carga' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

    expect(await screen.findByText('Informe a carga horária.')).toBeInTheDocument();
    expect(cursosApi.criarCurso).not.toHaveBeenCalled();
  });
});

describe('FormacaoFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cursosApi.listarCursos.mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });
  });

  const formacao = {
    id: 3,
    titulo: 'Trilha de Compras',
    descricao: null,
    modelo_certificado_id: null,
    cursos: [{ id: 10, titulo: 'Lei 14.133', carga_horaria_minutos: 600, pivot: { ordem: 1, obrigatorio: true } }],
  } as unknown as import('@sysgov/sdk').Formacao;

  it('exige ao menos um curso obrigatório antes de salvar', async () => {
    render(<FormacaoFormModal formacao={formacao} onClose={() => undefined} onSalvo={() => undefined} />);

    fireEvent.click(await screen.findByRole('switch', { name: 'Lei 14.133 é obrigatório' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Marque ao menos um curso como obrigatório.')).toBeInTheDocument();
    expect(cursosApi.atualizarFormacao).not.toHaveBeenCalled();
  });

  it('envia a composição com a ordem da lista', async () => {
    cursosApi.atualizarFormacao.mockResolvedValue({});
    const onSalvo = vi.fn();
    render(<FormacaoFormModal formacao={formacao} onClose={() => undefined} onSalvo={onSalvo} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(cursosApi.atualizarFormacao).toHaveBeenCalledWith(3, expect.objectContaining({ cursos: [{ curso_id: 10, obrigatorio: true, ordem: 1 }] }));
  });
});
