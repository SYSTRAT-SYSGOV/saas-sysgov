import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// O Select (Radix) mede o próprio tamanho com ResizeObserver, que o jsdom não tem.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const cursosApi = vi.hoisted(() => ({
  criarCampoInscricao: vi.fn(),
  atualizarCampoInscricao: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { CampoInscricaoFormModal } from './CampoInscricaoFormModal';

describe('CampoInscricaoFormModal — tarefa 6.4', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria um campo de texto simples (tipo padrão)', async () => {
    cursosApi.criarCampoInscricao.mockResolvedValue({ id: 1 });
    const onSalvo = vi.fn();
    render(<CampoInscricaoFormModal open cursoId={7} onClose={() => undefined} onSalvo={onSalvo} />);

    fireEvent.change(screen.getByLabelText('Rótulo'), { target: { value: 'Órgão de origem' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(cursosApi.criarCampoInscricao).toHaveBeenCalledWith(7, {
      rotulo: 'Órgão de origem',
      tipo: 'texto',
      obrigatorio: false,
      opcoes: null,
    });
    expect(onSalvo).toHaveBeenCalled();
  });

  it('sem rótulo, mostra erro e não chama a API', () => {
    render(<CampoInscricaoFormModal open cursoId={7} onClose={() => undefined} onSalvo={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('Informe o rótulo do campo.')).toBeInTheDocument();
    expect(cursosApi.criarCampoInscricao).not.toHaveBeenCalled();
  });

  it('edita um campo de seleção existente: opções pré-preenchidas, permite adicionar/remover', async () => {
    const campo = { id: 5, curso_id: 7, rotulo: 'Unidade', tipo: 'selecao' as const, obrigatorio: true, opcoes: ['Sede', 'Filial'], ordem: 1, ativo: true };
    cursosApi.atualizarCampoInscricao.mockResolvedValue({ ...campo, opcoes: ['Sede', 'Filial', 'Regional'] });
    const onSalvo = vi.fn();
    render(<CampoInscricaoFormModal open cursoId={7} campo={campo} onClose={() => undefined} onSalvo={onSalvo} />);

    expect(screen.getByLabelText('Opção 1')).toHaveValue('Sede');
    expect(screen.getByLabelText('Opção 2')).toHaveValue('Filial');

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar opção' }));
    fireEvent.change(screen.getByLabelText('Opção 3'), { target: { value: 'Regional' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(cursosApi.atualizarCampoInscricao).toHaveBeenCalledWith(5, {
      rotulo: 'Unidade',
      tipo: 'selecao',
      obrigatorio: true,
      opcoes: ['Sede', 'Filial', 'Regional'],
    });
  });

  it('seleção sem nenhuma opção preenchida: mostra erro e não salva', () => {
    const campo = { id: 5, curso_id: 7, rotulo: 'Unidade', tipo: 'selecao' as const, obrigatorio: false, opcoes: ['Sede'], ordem: 1, ativo: true };
    render(<CampoInscricaoFormModal open cursoId={7} campo={campo} onClose={() => undefined} onSalvo={() => undefined} />);

    fireEvent.change(screen.getByLabelText('Opção 1'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Campos do tipo seleção precisam de pelo menos uma opção.')).toBeInTheDocument();
    expect(cursosApi.atualizarCampoInscricao).not.toHaveBeenCalled();
  });

  it('remover opção some com a linha (mas nunca abaixo de 1)', () => {
    const campo = { id: 5, curso_id: 7, rotulo: 'Unidade', tipo: 'selecao' as const, obrigatorio: false, opcoes: ['Sede'], ordem: 1, ativo: true };
    render(<CampoInscricaoFormModal open cursoId={7} campo={campo} onClose={() => undefined} onSalvo={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Remover opção 1' })).toBeDisabled();
  });
});
