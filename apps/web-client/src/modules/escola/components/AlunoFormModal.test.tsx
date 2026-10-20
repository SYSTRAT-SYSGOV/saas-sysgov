import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import { escolaApi } from '../api';
import { AlunoFormModal } from './AlunoModals';

vi.mock('../api', async (original) => ({
  ...(await original<typeof import('../api')>()),
  escolaApi: {
    criarAluno: vi.fn(),
    atualizarAluno: vi.fn(),
    enviarFoto: vi.fn(),
    urlFoto: vi.fn(),
    buscarPessoas: vi.fn().mockResolvedValue([{ id: 7, nome: 'Marta Souza', cpf_mascarado: '***.222.333-**' }]),
  },
}));

const turmas = [{ id: 3, nome: '6º A', ano_letivo: 2026, turno: { nome: 'Manhã' } }] as never;

const erro422 = (data: Record<string, unknown>) =>
  new AxiosError('422', '422', undefined, undefined, { status: 422, data, statusText: '', headers: {}, config: {} as never });

const abrir = () =>
  render(<AlunoFormModal aluno={null} turmas={turmas} escolaNome="Escola" onClose={vi.fn()} onSaved={vi.fn()} onToast={vi.fn()} />);

const preencher = () => {
  fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Davi Souza' } });
  fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: '3' } });
};

describe('AlunoFormModal — aluno sem CPF', () => {
  it('pede o responsável e o envia ao salvar', async () => {
    vi.mocked(escolaApi.criarAluno).mockResolvedValue({ id: 1, nome: 'DAVI SOUZA' } as never);
    abrir();
    preencher();
    fireEvent.change(screen.getByPlaceholderText('Buscar por nome ou CPF'), { target: { value: 'Marta' } });
    fireEvent.click(await screen.findByRole('button', { name: /Marta Souza/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(escolaApi.criarAluno).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Davi Souza', responsavel_id: 7 })));
  });

  it('com CPF não pede responsável', () => {
    abrir();
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), { target: { value: '52998224725' } });
    expect(screen.queryByPlaceholderText('Buscar por nome ou CPF')).not.toBeInTheDocument();
  });

  it('mostra a pessoa semelhante e só cria com a confirmação', async () => {
    vi.mocked(escolaApi.criarAluno)
      .mockRejectedValueOnce(erro422({ message: 'Já existe pessoa com o mesmo nome e data de nascimento.', code: 'pessoa_semelhante_existente', sugestoes: [{ id: 9, nome: 'Davi Souza' }] }))
      .mockResolvedValueOnce({ id: 1, nome: 'DAVI SOUZA' } as never);
    abrir();
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    fireEvent.click(await screen.findByRole('button', { name: /cadastrar mesmo assim/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(escolaApi.criarAluno).toHaveBeenLastCalledWith(expect.objectContaining({ confirmar_novo: true })));
  });
});
