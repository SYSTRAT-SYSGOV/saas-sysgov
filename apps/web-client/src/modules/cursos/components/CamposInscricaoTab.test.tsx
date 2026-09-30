import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CampoInscricao } from '@sysgov/sdk';

// O Select (Radix) mede o próprio tamanho com ResizeObserver, que o jsdom não tem.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const cursosApi = vi.hoisted(() => ({
  listarCamposInscricao: vi.fn(),
  reordenarCamposInscricao: vi.fn(),
  ativarCampoInscricao: vi.fn(),
  desativarCampoInscricao: vi.fn(),
  excluirCampoInscricao: vi.fn(),
  criarCampoInscricao: vi.fn(),
  atualizarCampoInscricao: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { CamposInscricaoTab } from './CamposInscricaoTab';

const campos: CampoInscricao[] = [
  { id: 1, curso_id: 7, rotulo: 'Órgão de origem', tipo: 'texto', obrigatorio: true, opcoes: null, ordem: 1, ativo: true },
  { id: 2, curso_id: 7, rotulo: 'Unidade', tipo: 'selecao', obrigatorio: false, opcoes: ['Sede', 'Filial'], ordem: 2, ativo: false },
];

describe('CamposInscricaoTab — tarefa 6.4', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cursosApi.listarCamposInscricao.mockResolvedValue(campos);
  });

  it('carrega e lista os campos com tipo, obrigatoriedade e ativação', async () => {
    render(<CamposInscricaoTab cursoId={7} editavel />);

    expect(await screen.findByText('Órgão de origem')).toBeInTheDocument();
    expect(screen.getByText(/Texto curto · Obrigatório/)).toBeInTheDocument();
    expect(screen.getByText(/Seleção \(opções\) · Opcional · 2 opções/)).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });

  it('sem campos, mostra o estado vazio', async () => {
    cursosApi.listarCamposInscricao.mockResolvedValue([]);
    render(<CamposInscricaoTab cursoId={7} editavel />);
    expect(await screen.findByText('Nenhum campo extra')).toBeInTheDocument();
  });

  it('reordenar: subir o segundo campo troca a ordem com o primeiro', async () => {
    cursosApi.reordenarCamposInscricao.mockResolvedValue([campos[1], campos[0]]);
    render(<CamposInscricaoTab cursoId={7} editavel />);
    await screen.findByText('Unidade');

    fireEvent.click(screen.getByRole('button', { name: 'Subir Unidade' }));

    await waitFor(() => expect(cursosApi.reordenarCamposInscricao).toHaveBeenCalledWith(7, [2, 1]));
  });

  it('o botão de subir do primeiro item e de descer do último ficam desabilitados', async () => {
    render(<CamposInscricaoTab cursoId={7} editavel />);
    await screen.findByText('Unidade');

    expect(screen.getByRole('button', { name: 'Subir Órgão de origem' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descer Unidade' })).toBeDisabled();
  });

  it('ativar/desativar chama o endpoint certo e recarrega a lista', async () => {
    cursosApi.ativarCampoInscricao.mockResolvedValue({ ...campos[1], ativo: true });
    render(<CamposInscricaoTab cursoId={7} editavel />);
    await screen.findByText('Unidade');

    fireEvent.click(screen.getByRole('button', { name: 'Ativar' }));

    await waitFor(() => expect(cursosApi.ativarCampoInscricao).toHaveBeenCalledWith(2));
    expect(cursosApi.listarCamposInscricao).toHaveBeenCalledTimes(2);
  });

  it('excluir: confirma no diálogo e chama a API', async () => {
    cursosApi.excluirCampoInscricao.mockResolvedValue({ deleted: true });
    render(<CamposInscricaoTab cursoId={7} editavel />);
    await screen.findByText('Órgão de origem');

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Órgão de origem' }));
    expect(screen.getByText(/Excluir "Órgão de origem"/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(cursosApi.excluirCampoInscricao).toHaveBeenCalledWith(1));
  });

  it('erro ao excluir (campo com respostas) é mostrado na tela', async () => {
    cursosApi.excluirCampoInscricao.mockRejectedValue(new Error('Este campo já tem respostas e não pode ser excluído. Desative-o em vez de excluir.'));
    render(<CamposInscricaoTab cursoId={7} editavel />);
    await screen.findByText('Órgão de origem');

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Órgão de origem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByText('Este campo já tem respostas e não pode ser excluído. Desative-o em vez de excluir.')).toBeInTheDocument();
  });

  it('não editável: some com os botões de ação e o "novo campo"', async () => {
    render(<CamposInscricaoTab cursoId={7} editavel={false} />);
    await screen.findByText('Órgão de origem');

    expect(screen.queryByRole('button', { name: 'Novo campo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar Órgão de origem' })).not.toBeInTheDocument();
  });

  it('novo campo: abre o modal e cria via API', async () => {
    cursosApi.criarCampoInscricao.mockResolvedValue({ ...campos[0], id: 3, rotulo: 'CPF' });
    render(<CamposInscricaoTab cursoId={7} editavel />);
    await screen.findByText('Órgão de origem');

    fireEvent.click(screen.getByRole('button', { name: 'Novo campo' }));
    fireEvent.change(screen.getByLabelText('Rótulo'), { target: { value: 'CPF' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(cursosApi.criarCampoInscricao).toHaveBeenCalledWith(7, { rotulo: 'CPF', tipo: 'texto', obrigatorio: false, opcoes: null }));
  });
});
