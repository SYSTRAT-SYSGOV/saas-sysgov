import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const cursosApi = vi.hoisted(() => ({
  listarCamposInscricao: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { FormularioInscricaoModal } from './FormularioInscricaoModal';

describe('FormularioInscricaoModal — tarefa 6.5 (autoinscrição no catálogo)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sem campos configurados, mostra aviso e confirma direto', async () => {
    cursosApi.listarCamposInscricao.mockResolvedValue([]);
    const onConfirmar = vi.fn().mockResolvedValue(undefined);

    render(<FormularioInscricaoModal open cursoId={2} descricao="Curso X — Turma 1" onClose={() => undefined} onConfirmar={onConfirmar} />);

    expect(await screen.findByText('Nenhuma informação adicional é necessária para esta inscrição.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscrição' }));

    await waitFor(() => expect(onConfirmar).toHaveBeenCalledWith([]));
  });

  it('campo obrigatório vazio: bloqueia e não chama onConfirmar', async () => {
    cursosApi.listarCamposInscricao.mockResolvedValue([
      { id: 1, curso_id: 2, rotulo: 'CPF', tipo: 'texto', obrigatorio: true, opcoes: null, ordem: 1, ativo: true },
    ]);
    const onConfirmar = vi.fn();

    render(<FormularioInscricaoModal open cursoId={2} descricao="Curso X — Turma 1" onClose={() => undefined} onConfirmar={onConfirmar} />);
    await screen.findByLabelText('CPF (obrigatório)');

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscrição' }));

    expect(await screen.findByText('O campo "CPF" é obrigatório.')).toBeInTheDocument();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('preenchido, envia as respostas e mostra o erro do backend sem fechar o modal', async () => {
    cursosApi.listarCamposInscricao.mockResolvedValue([
      { id: 1, curso_id: 2, rotulo: 'CPF', tipo: 'texto', obrigatorio: true, opcoes: null, ordem: 1, ativo: true },
    ]);
    const erro = Object.assign(new Error('A turma está lotada.'), { response: { status: 422, data: { message: 'A turma está lotada.' } } });
    const onConfirmar = vi.fn().mockRejectedValue(erro);

    render(<FormularioInscricaoModal open cursoId={2} descricao="Curso X — Turma 1" onClose={() => undefined} onConfirmar={onConfirmar} />);
    await screen.findByLabelText('CPF (obrigatório)');

    fireEvent.change(screen.getByLabelText('CPF (obrigatório)'), { target: { value: '123.456.789-00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscrição' }));

    expect(await screen.findByText('A turma está lotada.')).toBeInTheDocument();
    expect(onConfirmar).toHaveBeenCalledWith([{ campo_id: 1, valor: '123.456.789-00' }]);
    // O modal segue montado (não fechou) para o usuário tentar de novo.
    expect(screen.getByRole('button', { name: 'Confirmar inscrição' })).toBeInTheDocument();
  });

  it('tipo caixa_marcacao: vai sempre marcado ("nao" por padrão), mesmo sem interação', async () => {
    cursosApi.listarCamposInscricao.mockResolvedValue([
      { id: 3, curso_id: 2, rotulo: 'Aceita contato', tipo: 'caixa_marcacao', obrigatorio: false, opcoes: null, ordem: 1, ativo: true },
    ]);
    const onConfirmar = vi.fn().mockResolvedValue(undefined);

    render(<FormularioInscricaoModal open cursoId={2} descricao="Curso X — Turma 1" onClose={() => undefined} onConfirmar={onConfirmar} />);
    await screen.findByRole('switch', { name: 'Aceita contato' });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscrição' }));

    await waitFor(() => expect(onConfirmar).toHaveBeenCalledWith([{ campo_id: 3, valor: 'nao' }]));
  });
});
