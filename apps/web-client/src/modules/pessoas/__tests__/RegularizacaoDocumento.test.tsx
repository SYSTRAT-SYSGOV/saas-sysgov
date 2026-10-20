import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import { RegularizarDocumentoModal } from '../views/RegularizarDocumentoModal';
import { pessoasApi, type Pessoa } from '../api';

vi.mock('../api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api')>();
  return {
    ...original,
    pessoasApi: { ...original.pessoasApi, regularizarDocumento: vi.fn(), mesclar: vi.fn() },
  };
});

const pessoa = { id: 5, nome: 'Maria Pendente', documento_pendente: true, cpf_mascarado: '—' } as Pessoa;

function erro422(data: Record<string, unknown>) {
  const e = new AxiosError('Request failed', '422');
  e.response = { status: 422, data, statusText: 'Unprocessable', headers: {}, config: {} as never };
  return e;
}

const digitarCpf = (valor: string) => fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), { target: { value: valor } });

describe('Regularização do documento e mesclagem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('só habilita o botão com CPF completo e regulariza mantendo o cadastro', async () => {
    vi.mocked(pessoasApi.regularizarDocumento).mockResolvedValue({ ...pessoa, documento_pendente: false });
    const onRegularizado = vi.fn();
    render(<RegularizarDocumentoModal pessoa={pessoa} podeMesclar onFechar={vi.fn()} onRegularizado={onRegularizado} onMesclado={vi.fn()} />);

    const botao = screen.getByRole('button', { name: 'Regularizar' });
    expect(botao).toBeDisabled();

    digitarCpf('52998224725');
    expect(screen.getByPlaceholderText('000.000.000-00')).toHaveValue('529.982.247-25');
    expect(botao).toBeEnabled();

    fireEvent.click(botao);
    await waitFor(() => expect(onRegularizado).toHaveBeenCalled());
    expect(pessoasApi.regularizarDocumento).toHaveBeenCalledWith(5, '52998224725');
  });

  it('CPF de outra pessoa: mostra a existente e oferece a mesclagem', async () => {
    vi.mocked(pessoasApi.regularizarDocumento).mockRejectedValue(
      erro422({
        message: 'Já existe uma pessoa cadastrada com este CPF neste órgão.',
        code: 'documento_ja_cadastrado',
        pessoa_existente: { id: 9, nome: 'Maria Silva', cpf_mascarado: '***.982.247-**' },
        mesclagem_disponivel: true,
      }),
    );
    vi.mocked(pessoasApi.mesclar).mockResolvedValue({ ...pessoa, id: 9 });
    const onMesclado = vi.fn();
    render(<RegularizarDocumentoModal pessoa={pessoa} podeMesclar onFechar={vi.fn()} onRegularizado={vi.fn()} onMesclado={onMesclado} />);

    digitarCpf('52998224725');
    fireEvent.click(screen.getByRole('button', { name: 'Regularizar' }));

    expect(await screen.findByText('Este CPF já pertence a outra pessoa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Mesclar com Maria Silva/i }));

    await waitFor(() => expect(onMesclado).toHaveBeenCalled());
    expect(pessoasApi.mesclar).toHaveBeenCalledWith(5, 9);
  });

  it('sem permissão de mesclar, não oferece o botão', async () => {
    vi.mocked(pessoasApi.regularizarDocumento).mockRejectedValue(
      erro422({
        message: 'Já existe uma pessoa cadastrada com este CPF neste órgão.',
        code: 'documento_ja_cadastrado',
        pessoa_existente: { id: 9, nome: 'Maria Silva', cpf_mascarado: '***.982.247-**' },
        mesclagem_disponivel: true,
      }),
    );
    render(<RegularizarDocumentoModal pessoa={pessoa} podeMesclar={false} onFechar={vi.fn()} onRegularizado={vi.fn()} onMesclado={vi.fn()} />);

    digitarCpf('52998224725');
    fireEvent.click(screen.getByRole('button', { name: 'Regularizar' }));

    expect(await screen.findByText('Este CPF já pertence a outra pessoa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mesclar com/i })).not.toBeInTheDocument();
  });

  it('CPF inválido mostra o erro do servidor e nada é mesclado', async () => {
    vi.mocked(pessoasApi.regularizarDocumento).mockRejectedValue(erro422({ message: 'O CPF informado é inválido.', code: 'documento_invalido' }));
    render(<RegularizarDocumentoModal pessoa={pessoa} podeMesclar onFechar={vi.fn()} onRegularizado={vi.fn()} onMesclado={vi.fn()} />);

    digitarCpf('11111111111');
    fireEvent.click(screen.getByRole('button', { name: 'Regularizar' }));

    expect(await screen.findByText(/O CPF informado é inválido/)).toBeInTheDocument();
    expect(pessoasApi.mesclar).not.toHaveBeenCalled();
  });
});
