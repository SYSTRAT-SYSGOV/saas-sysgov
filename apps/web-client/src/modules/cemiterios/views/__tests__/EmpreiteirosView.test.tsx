import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmpreiteirosView } from '../EmpreiteirosView';
import { cemiteriosApi } from '../../api';

vi.mock('@/core/rbac/useCan', () => ({
  useCan: () => ({
    can: () => true,
    cannot: () => false,
  }),
}));

vi.mock('@/modules/pessoas/api', () => ({
  pessoasApi: {
    listar: vi.fn().mockResolvedValue({
      data: [
        {
          id: 55,
          nome: 'Carlos Pereira Construtor',
          cpf_mascarado: '***.444.555-**',
          status: 'ativo',
        },
      ],
      total: 1,
      current_page: 1,
      last_page: 1,
      per_page: 20,
    }),
    obter: vi.fn().mockResolvedValue({
      id: 55,
      nome: 'Carlos Pereira Construtor',
      cpf_mascarado: '***.444.555-**',
      status: 'ativo',
    }),
    criar: vi.fn(),
    adicionarContato: vi.fn(),
  },
  erroApi: (e: any) => ({ mensagem: e?.message || 'Erro' }),
}));

const mockEmpreiteiros: any = {
  data: [
    {
      id: 1,
      nome: 'Construtora Vale dos Lírios LTDA',
      tipo_doc: 'cnpj',
      documento_mascarado: '**.123.456/0001-**',
      responsavel_tecnico: 'Eng. Roberto Santos',
      situacao: 'apto' as const,
      pessoa_id: null,
      alvaras: [],
      penalidades: [],
    },
    {
      id: 2,
      nome: 'Nome Antigo Desatualizado',
      tipo_doc: 'cpf',
      documento_mascarado: '***.111.222-**',
      responsavel_tecnico: 'Carlos Pereira',
      situacao: 'apto' as const,
      pessoa_id: 55,
      pessoa: {
        id: 55,
        nome: 'Carlos Pereira Construtor',
        cpf_mascarado: '***.444.555-**',
      },
      alvaras: [],
      penalidades: [],
    },
  ],
  total: 2,
  current_page: 1,
  last_page: 1,
};

const mockObras: any = {
  data: [],
  total: 0,
  current_page: 1,
  last_page: 1,
};

describe('EmpreiteirosView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(cemiteriosApi, 'empreiteiros').mockResolvedValue(mockEmpreiteiros as any);
    vi.spyOn(cemiteriosApi, 'obras').mockResolvedValue(mockObras as any);
  });

  it('renderiza empreiteiro vinculado ao cadastro central e preserva fallback para registros legados', async () => {
    render(<EmpreiteirosView />);

    await waitFor(() => {
      // Registro legado (sem pessoa_id)
      expect(screen.getByText('Construtora Vale dos Lírios LTDA')).toBeInTheDocument();
      expect(screen.getByText('**.123.456/0001-**')).toBeInTheDocument();
      expect(screen.getByText('Eng. Roberto Santos')).toBeInTheDocument();

      // Registro com pessoa central (pessoa_id)
      expect(screen.getByText('Carlos Pereira Construtor')).toBeInTheDocument();
      expect(screen.getByText('Cadastro Central')).toBeInTheDocument();
      expect(screen.getByText('***.444.555-**')).toBeInTheDocument();
      expect(screen.queryByText('Nome Antigo Desatualizado')).not.toBeInTheDocument();
    });
  });

  it('permite abrir modal de novo empreiteiro contendo o PessoaPicker', async () => {
    render(<EmpreiteirosView />);

    const btnNovo = screen.getByRole('button', { name: /Novo empreiteiro/i });
    fireEvent.click(btnNovo);

    expect(screen.getByRole('heading', { name: /Novo empreiteiro/i })).toBeInTheDocument();
    expect(screen.getByText('Vincular Pessoa Física (Cadastro Central)')).toBeInTheDocument();
    expect(screen.getByText('Buscar por nome ou CPF no cadastro geral...')).toBeInTheDocument();
  });
});
