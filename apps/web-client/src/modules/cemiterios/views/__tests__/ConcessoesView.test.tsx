import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConcessoesView } from '../ConcessoesView';
import { cemiteriosApi } from '../../api';
import { acionarMenu } from '@/test-utils/acoesMenu';

vi.mock('@/core/rbac/useCan', () => ({
  useCan: () => ({
    can: () => true,
    cannot: () => false,
  }),
}));

vi.mock('../../CemiteriosContext', () => ({
  useCemiteriosNavigation: () => ({
    cemiterioAtivoId: 1,
    cemiterioAtivo: { id: 1, nome: 'Cemitério da Paz', setores: [] },
  }),
}));

vi.mock('@/modules/pessoas/hooks', () => ({
  usePessoaPicker: () => ({
    buscarPessoas: vi.fn().mockResolvedValue([]),
    criarPessoaRapido: vi.fn(),
  }),
}));

vi.mock('@/modules/pessoas/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/pessoas/api')>();
  return {
    ...actual,
    pessoasApi: {
      ...actual.pessoasApi,
      obter: vi.fn().mockResolvedValue({
        id: 10,
        nome: 'José Central MDM',
        cpf_mascarado: '***.444.555-**',
        enderecos: [{ logradouro: 'Rua das Flores', numero: '123', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP' }],
        contatos: [
          { tipo: 'email', valor: 'jose@exemplo.com' },
          { tipo: 'celular', valor: '(11) 98888-7777' },
        ],
      }),
    },
  };
});

vi.mock('../../api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../api')>();
  return {
    ...original,
    cemiteriosApi: {
      concessoes: vi.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            numero: 'CONC-2026-001',
            modalidade: 'perpetua',
            situacao: 'vigente',
            inicio: '2026-01-01',
            termino: null,
            pendencia_regularizacao: false,
            inadimplente: false,
            guias_count: 1,
            concessionario: { id: 10, nome: 'João da Silva', documento_mascarado: '***.111.222-**', pessoa_id: 10 },
            jazigo: { id: 1, codigo: 'JAZ-01', setor: { codigo: 'A' } },
          },
        ],
        total: 1,
      }),
      titulares: vi.fn().mockResolvedValue({
        data: [
          {
            id: 10,
            nome: 'João da Silva MDM',
            documento_mascarado: '***.111.222-**',
            tipo_doc: 'cpf',
            pessoa_id: 10,
            email: 'joao@silva.com',
            telefone: '(11) 99999-1111',
            endereco: 'Rua Principal, 100',
            base_legal: 'execucao_contrato',
            titular_falecido: false,
            data_falecimento_titular: null,
          },
          {
            id: 20,
            nome: 'Maria Legado Local',
            documento_mascarado: '***.222.333-**',
            tipo_doc: 'cpf',
            pessoa_id: null,
            email: 'maria@legado.com',
            telefone: '(11) 98888-2222',
            endereco: 'Av. Brasil, 500',
            base_legal: 'obrigacao_legal',
            titular_falecido: true,
            data_falecimento_titular: '2025-10-10',
            processo_inventario: '00123-2025',
          },
          {
            id: 30,
            nome: '.',
            documento_mascarado: '***.125.320-**',
            tipo_doc: 'cpf',
            pessoa_id: null,
            email: null,
            telefone: null,
            endereco: '.',
            base_legal: 'execucao_contrato',
            titular_falecido: false,
            data_falecimento_titular: null,
          },
        ],
        total: 3,
      }),
      atualizarConcessionario: vi.fn().mockResolvedValue({ id: 20, nome: 'Maria Atualizada' }),
      criarTitular: vi.fn().mockResolvedValue({ id: 30, nome: 'Novo Titular' }),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof global.ResizeObserver === 'undefined') {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe('ConcessoesView — Subaba Concessionários com Filtros e DataTable Rica', () => {
  it('renderiza inicialmente a aba de concessões', async () => {
    render(<ConcessoesView />);
    expect(await screen.findByText('CONC-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Concessionários')).toBeInTheDocument();
  });

  it('alterna para a subaba Concessionários e exibe os KPIs e Filtros Avançados', async () => {
    render(<ConcessoesView />);

    const tabConcessionarios = screen.getByRole('tab', { name: /concessionários/i });
    fireEvent.click(tabConcessionarios);

    // Verifica se os KPIs foram renderizados
    expect(await screen.findByText('Total Concessionários')).toBeInTheDocument();
    expect(screen.getByText('MDM Central Ativo')).toBeInTheDocument();
    expect(screen.getByText('Registros Legados')).toBeInTheDocument();
    expect(screen.getByText('Titulares Falecidos')).toBeInTheDocument();

    // Verifica se os Concessionários foram listados na DataTable com badges corretos
    expect(await screen.findByText('João da Silva MDM')).toBeInTheDocument();
    expect(screen.getByText('MDM Ativo')).toBeInTheDocument();

    expect(screen.getByText('Maria Legado Local')).toBeInTheDocument();
    expect(screen.getAllByText('Legado Local').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Falecido/i).length).toBeGreaterThan(0);

    // Verifica a presença dos filtros avançados
    expect(screen.getByPlaceholderText(/buscar concessionário por nome/i)).toBeInTheDocument();
    expect(screen.getByText('Filtros Avançados')).toBeInTheDocument();
  });

  it('permite abrir o modal de edição de concessionário ao clicar em Editar', async () => {
    render(<ConcessoesView />);

    const tabConcessionarios = screen.getByRole('tab', { name: /concessionários/i });
    fireEvent.click(tabConcessionarios);

    await acionarMenu(/Ações do titular/i, /editar titular/i);

    // O modal deve ser exibido com size 2xl e campos sem quebras
    expect(await screen.findByText(/Editar Concessionário — #10/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('João da Silva MDM')).toBeInTheDocument();
    expect(screen.getByDisplayValue('joao@silva.com')).toBeInTheDocument();
  });

  it('permite abrir e fechar filtros avançados de concessionários', async () => {
    render(<ConcessoesView />);

    const tabConcessionarios = screen.getByRole('tab', { name: /concessionários/i });
    fireEvent.click(tabConcessionarios);

    const botaoFiltrosAvancados = await screen.findByRole('button', { name: /filtros avançados/i });
    fireEvent.click(botaoFiltrosAvancados);

    // Verifica campos expandidos
    expect(screen.getByText('Tipo de Documento')).toBeInTheDocument();
    expect(screen.getByText('Origem no Cadastro Central')).toBeInTheDocument();
    expect(screen.getByText('Situação Vital / Sucessão')).toBeInTheDocument();
    expect(screen.getByText('Base Legal (LGPD)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /menos filtros/i }));
  });

  it('exibe os KPIs de Concessões no topo da subaba de concessões', async () => {
    render(<ConcessoesView />);

    // Na aba de concessões, deve mostrar os 5 KPIs consolidados
    expect(await screen.findByText('Total Concessões')).toBeInTheDocument();
    expect(screen.getByText('Vigentes Ativas')).toBeInTheDocument();
    expect(screen.getByText('Perpétuas / Temporárias')).toBeInTheDocument();
    expect(screen.getByText('Inadimplentes')).toBeInTheDocument();
    expect(screen.getByText('Alerta de Sucessão')).toBeInTheDocument();
  });

  it('exibe campos avançados de endereço com CEP, múltiplos contatos e observações no modal de edição', async () => {
    render(<ConcessoesView />);

    const tabConcessionarios = screen.getByRole('tab', { name: /concessionários/i });
    fireEvent.click(tabConcessionarios);

    await acionarMenu(/Ações do titular/i, /editar titular/i);

    // O modal deve conter as seções de Endereço Residencial (Integração CEP), Contatos e Observações
    expect(await screen.findByText('Endereço Residencial (Integração CEP)')).toBeInTheDocument();
    expect(screen.getByTitle('Consultar CEP na API ViaCEP')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('00000-000')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Rua, Avenida, Praça...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex.: 123 ou S/N')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nome do bairro')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Cidade')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('SP')).toBeInTheDocument();

    // Contatos e Comunicação
    expect(screen.getByText('Contatos e Comunicação')).toBeInTheDocument();
    const btnAddContato = screen.getByRole('button', { name: /adicionar mais contatos/i });
    expect(btnAddContato).toBeInTheDocument();

    // Clica para adicionar um novo contato dinâmico
    fireEvent.click(btnAddContato);
    expect(screen.getByPlaceholderText('Telefone, e-mail ou WhatsApp...')).toBeInTheDocument();

    // Observações e Notas Administrativas
    expect(screen.getByText('Observações e Notas Administrativas')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/insira detalhes sobre histórico do concessionário/i)).toBeInTheDocument();
  });

  it('exibe badge e alerta amigável quando titular legado possui nome inválido (como ponto ou traço)', async () => {
    render(<ConcessoesView />);

    const tabConcessionarios = screen.getByRole('tab', { name: /concessionários/i });
    fireEvent.click(tabConcessionarios);

    // O terceiro registro possui nome "." no banco legado
    expect(await screen.findByText('Nome Não Informado (Legado)')).toBeInTheDocument();
    expect(screen.getByText('Clique em Editar para regularizar')).toBeInTheDocument();
  });
});

