import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const cursosApi = vi.hoisted(() => ({
  buscarUsuarios: vi.fn(),
  listarCamposInscricao: vi.fn(),
  inscreverUsuario: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { InscreverParticipanteModal } from './InscreverParticipanteModal';

const escolherParticipante = async (nome = 'Ana Souza') => {
  fireEvent.change(screen.getByPlaceholderText('Buscar por nome ou e-mail (mín. 2 letras)'), { target: { value: 'ana' } });
  await waitFor(() => expect(cursosApi.buscarUsuarios).toHaveBeenCalledWith('ana'), { timeout: 1000 });
  fireEvent.click(await screen.findByText(nome));
};

describe('InscreverParticipanteModal — tarefa 6.5 (inscrição direta pelo Administrador)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cursosApi.buscarUsuarios.mockResolvedValue([{ id: 9, name: 'Ana Souza', email: 'ana@teste.gov.br' }]);
  });

  it('sem campos extras no curso: inscreve só com o participante escolhido', async () => {
    cursosApi.listarCamposInscricao.mockResolvedValue([]);
    cursosApi.inscreverUsuario.mockResolvedValue({ id: 1, status: 'confirmada' });
    const onSalvo = vi.fn();

    render(<InscreverParticipanteModal open turmaId={5} cursoId={2} onClose={() => undefined} onSalvo={onSalvo} />);
    await escolherParticipante();

    fireEvent.click(screen.getByRole('button', { name: 'Inscrever' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalledWith('Ana Souza inscrito(a): confirmada.'));
    expect(cursosApi.inscreverUsuario).toHaveBeenCalledWith(5, 9, []);
  });

  it('curso com campo obrigatório: recusa sem resposta e envia depois de preenchido', async () => {
    cursosApi.listarCamposInscricao.mockResolvedValue([
      { id: 11, curso_id: 2, rotulo: 'Órgão de origem', tipo: 'texto', obrigatorio: true, opcoes: null, ordem: 1, ativo: true },
    ]);
    cursosApi.inscreverUsuario.mockResolvedValue({ id: 2, status: 'pendente' });
    const onSalvo = vi.fn();

    render(<InscreverParticipanteModal open turmaId={5} cursoId={2} onClose={() => undefined} onSalvo={onSalvo} />);
    await escolherParticipante();
    expect(await screen.findByLabelText('Órgão de origem (obrigatório)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Inscrever' }));
    expect(await screen.findByText('O campo "Órgão de origem" é obrigatório.')).toBeInTheDocument();
    expect(cursosApi.inscreverUsuario).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Órgão de origem (obrigatório)'), { target: { value: 'Secretaria de Obras' } });
    fireEvent.click(screen.getByRole('button', { name: 'Inscrever' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalledWith('Ana Souza inscrito(a): pendente.'));
    expect(cursosApi.inscreverUsuario).toHaveBeenCalledWith(5, 9, [{ campo_id: 11, valor: 'Secretaria de Obras' }]);
  });

  it('campos ignora os inativos (já filtrados pelo backend, mas confere no cliente também)', async () => {
    cursosApi.listarCamposInscricao.mockResolvedValue([
      { id: 11, curso_id: 2, rotulo: 'Ativo', tipo: 'texto', obrigatorio: false, opcoes: null, ordem: 1, ativo: true },
      { id: 12, curso_id: 2, rotulo: 'Inativo', tipo: 'texto', obrigatorio: false, opcoes: null, ordem: 2, ativo: false },
    ]);
    render(<InscreverParticipanteModal open turmaId={5} cursoId={2} onClose={() => undefined} onSalvo={() => undefined} />);
    await escolherParticipante();

    expect(await screen.findByLabelText('Ativo')).toBeInTheDocument();
    expect(screen.queryByLabelText('Inativo')).not.toBeInTheDocument();
  });
});
