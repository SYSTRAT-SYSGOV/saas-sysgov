import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModalImportadorPessoas } from '../views/ModalImportadorPessoas';
import { pessoasApi } from '../api';

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof import('../api')>('../api');
  return {
    ...actual,
    pessoasApi: { ...actual.pessoasApi, criar: vi.fn() },
  };
});

function carregarArquivo(input: HTMLElement, conteudo: string) {
  const file = new File([conteudo], 'pessoas.csv', { type: 'text/csv' });
  Object.defineProperty(input, 'files', { value: [file] });
  fireEvent.change(input);
}

describe('ModalImportadorPessoas', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('marca linha sem CPF e CPF duplicado como inválidos, mantendo as demais linhas válidas', async () => {
    render(<ModalImportadorPessoas aberto onFechar={vi.fn()} onSucesso={vi.fn()} />);

    const csv = [
      'nome,cpf,nome_social,data_nascimento,sexo,nis',
      'Maria da Silva,12345678900,,,,',
      'Sem CPF,,,,,',
      'Maria Repetida,12345678900,,,,',
    ].join('\n');

    carregarArquivo(document.querySelector('input[type="file"]')!, csv);

    await waitFor(() => expect(screen.getByText('Registros Analisados (3):')).toBeInTheDocument());

    expect(screen.getByText('✓ 1 Válido(s)')).toBeInTheDocument();
    expect(screen.getByText('⚠ 2 com Erro')).toBeInTheDocument();
    expect(screen.getByText('CPF é obrigatório')).toBeInTheDocument();
    expect(screen.getByText('CPF duplicado no arquivo')).toBeInTheDocument();
  });

  it('executa a importação da linha válida, informa sucesso e dispara onSucesso', async () => {
    (pessoasApi.criar as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });
    const onSucesso = vi.fn();

    render(<ModalImportadorPessoas aberto onFechar={vi.fn()} onSucesso={onSucesso} />);

    const csv = ['nome,cpf,nome_social,data_nascimento,sexo,nis', 'Maria da Silva,12345678900,,,,'].join('\n');
    carregarArquivo(document.querySelector('input[type="file"]')!, csv);

    await waitFor(() => expect(screen.getByText('Registros Analisados (1):')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Importar 1 Pessoa\(s\) Válida\(s\)/i }));

    await waitFor(() => expect(screen.getByText('Importação concluída!')).toBeInTheDocument());
    expect(screen.getByText('✓ Sucesso: 1')).toBeInTheDocument();
    expect(pessoasApi.criar).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Maria da Silva', cpf: '12345678900' }));
    expect(onSucesso).toHaveBeenCalled();
  });

  it('não interrompe o lote quando uma linha é rejeitada pelo backend, registrando a falha no relatório', async () => {
    (pessoasApi.criar as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce({ response: { status: 422, data: { message: 'Já existe uma pessoa cadastrada com este CPF.' } } })
      .mockResolvedValueOnce({ id: 2 });

    render(<ModalImportadorPessoas aberto onFechar={vi.fn()} onSucesso={vi.fn()} />);

    const csv = [
      'nome,cpf,nome_social,data_nascimento,sexo,nis',
      'Maria Duplicada,12345678900,,,,',
      'Joao Novo,98765432100,,,,',
    ].join('\n');
    carregarArquivo(document.querySelector('input[type="file"]')!, csv);

    await waitFor(() => expect(screen.getByText('Registros Analisados (2):')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Importar 2 Pessoa\(s\) Válida\(s\)/i }));

    await waitFor(() => expect(screen.getByText('Importação concluída!')).toBeInTheDocument());
    expect(screen.getByText('✓ Sucesso: 1')).toBeInTheDocument();
    expect(screen.getByText('Erros: 1')).toBeInTheDocument();
    expect(pessoasApi.criar).toHaveBeenCalledTimes(2);
  });
});
