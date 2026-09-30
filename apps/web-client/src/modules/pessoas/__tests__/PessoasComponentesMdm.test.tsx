import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  PessoaCard,
  PessoaSummary,
  PessoaPicker,
  PessoaFormModal,
  PessoaVinculosBadge,
} from '@sysgov/ui';

describe('Componentes Reutilizáveis de Pessoa MDM (@sysgov/ui)', () => {
  it('PessoaCard renderiza nome, CPF mascarado e vínculos sem expor CPF literal', () => {
    const mockPessoa = {
      id: 42,
      nome: 'Mariana Ribeiro',
      nome_social: 'Mari',
      cpf_mascarado: '***.456.789-**',
      status: 'ativo' as const,
      email: 'mariana@sysgov.gov.br',
      telefone: '(41) 98765-4321',
      vinculos: [
        {
          id: 1,
          tipo_vinculo: 'servidor_carreira' as const,
          matricula: 'MAT-1234',
        },
      ],
    };

    render(<PessoaCard pessoa={mockPessoa} />);

    expect(screen.getByText('Mariana Ribeiro')).toBeInTheDocument();
    expect(screen.getByText('(Mari)')).toBeInTheDocument();
    expect(screen.getByText('***.456.789-**')).toBeInTheDocument();
    expect(screen.getByText('Servidor Efetivo')).toBeInTheDocument();
    expect(screen.getByText('Matrícula: MAT-1234')).toBeInTheDocument();

    // Garante que nenhum CPF sem máscara está no DOM
    expect(screen.queryByText('12345678900')).not.toBeInTheDocument();
  });

  it('PessoaSummary exibe versão compacta com CPF mascarado', () => {
    render(<PessoaSummary nome="Carlos Silva" cpf_mascarado="***.111.222-**" />);

    expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    expect(screen.getByText('***.111.222-**')).toBeInTheDocument();
  });

  it('PessoaVinculosBadge renderiza tipo de vínculo e matrícula funcional formatada', () => {
    render(
      <PessoaVinculosBadge
        vinculo={{
          tipo_vinculo: 'comissionado',
          matricula: 'COM-9901',
        }}
      />
    );

    expect(screen.getByText('Comissionado')).toBeInTheDocument();
    expect(screen.getByText('Matrícula: COM-9901')).toBeInTheDocument();
  });

  it('PessoaPicker abre lista, permite busca e seleciona opção', async () => {
    const mockOptions = [
      {
        id: 1,
        nome: 'João Coveiro',
        cpf_mascarado: '***.222.333-**',
        status: 'ativo' as const,
      },
      {
        id: 2,
        nome: 'Ana Pedreira',
        cpf_mascarado: '***.444.555-**',
        status: 'ativo' as const,
      },
    ];

    const handleChange = vi.fn();
    const handleSearch = vi.fn().mockResolvedValue(mockOptions);

    render(
      <PessoaPicker
        onChange={handleChange}
        onSearch={handleSearch}
        options={mockOptions}
        placeholder="Selecione um profissional..."
      />
    );

    // Dispara o combobox
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Lista de opções aparece
    expect(screen.getByText('João Coveiro')).toBeInTheDocument();
    expect(screen.getByText('***.222.333-**')).toBeInTheDocument();
    expect(screen.getByText('Ana Pedreira')).toBeInTheDocument();

    // Seleciona uma opção
    fireEvent.click(screen.getByText('João Coveiro'));

    expect(handleChange).toHaveBeenCalledWith(1, mockOptions[0]);
  });

  it('PessoaFormModal valida campos obrigatórios e rejeita CPF inválido', async () => {
    const handleSubmit = vi.fn();
    const handleClose = vi.fn();

    render(
      <PessoaFormModal
        open={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByText('Cadastro Rápido de Pessoa Física')).toBeInTheDocument();

    const btnSalvar = screen.getByRole('button', { name: /Salvar Pessoa/i });

    // Tentativa de submissão com campos vazios
    fireEvent.click(btnSalvar);
    expect(screen.getByText('O nome completo é obrigatório.')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();

    // Preenche nome mas CPF com dígitos repetidos inválidos
    const inputNome = screen.getByPlaceholderText('Ex.: Maria da Silva');
    const inputCpf = screen.getByPlaceholderText('000.000.000-00');

    fireEvent.change(inputNome, { target: { value: 'Teste Pessoa' } });
    fireEvent.change(inputCpf, { target: { value: '111.111.111-11' } });

    fireEvent.click(btnSalvar);
    expect(screen.getByText(/matematicamente inválidos/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });
});
