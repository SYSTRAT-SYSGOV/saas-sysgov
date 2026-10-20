import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PessoaCard, PessoaFormModal, PessoaPicker } from '@sysgov/ui';

const menor = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 8);
  return d.toISOString().slice(0, 10);
};

const preencherNomeENascimento = (nascimento: string) => {
  fireEvent.change(screen.getByPlaceholderText('Ex.: Maria da Silva'), { target: { value: 'Criança Sem CPF' } });
  const campoData = document.querySelector('input[type="date"]') as HTMLInputElement;
  fireEvent.change(campoData, { target: { value: nascimento } });
};

describe('Cadastro rápido de pessoa sem CPF (documento pendente)', () => {
  it('não oferece a opção sem CPF por padrão (compatível com os módulos atuais)', () => {
    render(<PessoaFormModal open onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.queryByText(/Pessoa sem CPF/i)).not.toBeInTheDocument();
  });

  it('com permitirSemCpf desliga o CPF e exige data de nascimento', () => {
    const onSubmit = vi.fn();
    render(<PessoaFormModal open onClose={vi.fn()} onSubmit={onSubmit} permitirSemCpf />);

    fireEvent.click(screen.getByLabelText(/Pessoa sem CPF/i));
    expect(screen.getByPlaceholderText('000.000.000-00')).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Ex.: Maria da Silva'), { target: { value: 'Alguém' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Pessoa/i }));

    expect(screen.getByText('A data de nascimento é obrigatória para pessoa sem CPF.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('menor sem CPF exige o responsável e mostra o seletor fornecido pelo módulo', () => {
    const onSubmit = vi.fn();
    render(
      <PessoaFormModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        permitirSemCpf
        responsavelId={null}
        renderResponsavel={({ obrigatorio }) => <div data-testid="seletor-responsavel">obrigatorio={String(obrigatorio)}</div>}
      />,
    );

    fireEvent.click(screen.getByLabelText(/Pessoa sem CPF/i));
    preencherNomeENascimento(menor());

    expect(screen.getByTestId('seletor-responsavel')).toHaveTextContent('obrigatorio=true');

    fireEvent.click(screen.getByRole('button', { name: /Salvar Pessoa/i }));
    expect(screen.getByText('O responsável é obrigatório para menor de idade sem CPF.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envia sem_cpf, o responsável e cpf vazio quando tudo está preenchido', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<PessoaFormModal open onClose={vi.fn()} onSubmit={onSubmit} permitirSemCpf responsavelId={77} renderResponsavel={() => <span>seletor</span>} />);

    fireEvent.click(screen.getByLabelText(/Pessoa sem CPF/i));
    preencherNomeENascimento(menor());
    fireEvent.click(screen.getByRole('button', { name: /Salvar Pessoa/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ nome: 'Criança Sem CPF', cpf: '', sem_cpf: true, responsavel_id: 77 });
  });

  it('adulto sem CPF não exige responsável', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<PessoaFormModal open onClose={vi.fn()} onSubmit={onSubmit} permitirSemCpf renderResponsavel={() => <span>seletor</span>} />);

    fireEvent.click(screen.getByLabelText(/Pessoa sem CPF/i));
    preencherNomeENascimento('1980-05-10');
    fireEvent.click(screen.getByRole('button', { name: /Salvar Pessoa/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ sem_cpf: true, responsavel_id: null });
  });

  it('mostra pessoas semelhantes; usar uma delas ou confirmar o cadastro novo', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const onUsar = vi.fn();
    const semelhantes = [{ id: 9, nome: 'Criança Sem CPF', cpf_mascarado: '—', documento_pendente: true }];
    render(<PessoaFormModal open onClose={vi.fn()} onSubmit={onSubmit} permitirSemCpf semelhantes={semelhantes} onUsarSemelhante={onUsar} />);

    fireEvent.click(screen.getByLabelText(/Pessoa sem CPF/i));
    preencherNomeENascimento('1980-05-10');

    expect(screen.getByRole('alert')).toHaveTextContent('Já existe pessoa com o mesmo nome e data de nascimento');

    fireEvent.click(screen.getByRole('button', { name: /Usar esta pessoa/i }));
    expect(onUsar).toHaveBeenCalledWith(semelhantes[0]);

    fireEvent.click(screen.getByRole('button', { name: /cadastrar mesmo assim/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ sem_cpf: true, confirmar_novo: true });
  });
});

describe('Indicador de documento pendente', () => {
  it('PessoaCard mostra o selo', () => {
    render(<PessoaCard pessoa={{ id: 1, nome: 'Sem CPF', cpf_mascarado: '—', documento_pendente: true }} />);

    expect(screen.getByText('Documento pendente')).toBeInTheDocument();
  });

  it('PessoaCard não mostra o selo para quem tem CPF', () => {
    render(<PessoaCard pessoa={{ id: 1, nome: 'Com CPF', cpf_mascarado: '***.123.456-**' }} />);

    expect(screen.queryByText('Documento pendente')).not.toBeInTheDocument();
  });

  it('PessoaPicker mostra o selo na pessoa selecionada', () => {
    render(
      <PessoaPicker
        value={1}
        pessoas={[{ id: 1, nome: 'Aluno Pendente', cpf_mascarado: '—', documento_pendente: true }]}
        canCreate={false}
      />,
    );

    expect(screen.getByText('Documento pendente')).toBeInTheDocument();
  });
});
