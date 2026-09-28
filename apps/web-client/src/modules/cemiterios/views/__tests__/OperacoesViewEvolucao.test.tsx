import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CemiteriosProvider } from '../../CemiteriosContext';
import { OperacoesView } from '../OperacoesView';
import { cemiteriosApi, type OrdemServico, type Inumacao, type Exumacao, type Trasladacao } from '../../api';

vi.mock('@/core/rbac/useCan', () => ({
  useCan: () => ({
    can: () => true,
    cannot: () => false,
  }),
}));

const mockOrdens: OrdemServico[] = [
  {
    id: 101,
    ano: 2026,
    numero: 42,
    tipo: 'inumacao',
    plot_id: 1,
    agendada_para: '2026-09-26T14:00:00Z',
    equipe: 'Equipe A',
    situacao: 'emitida',
    observacao: 'Aguardando cortejo',
    executada_em: null,
    jazigo: { id: 1, codigo: 'JAZ-01', cemiterio: { id: 1, nome: 'Cemitério Central' } },
    falecido: 'José da Silva',
  },
  {
    id: 102,
    ano: 2026,
    numero: 43,
    tipo: 'exumacao',
    plot_id: 2,
    agendada_para: '2026-09-26T16:00:00Z',
    equipe: 'Equipe B',
    situacao: 'em_execucao',
    observacao: 'Exumação ordinária',
    executada_em: null,
    jazigo: { id: 2, codigo: 'JAZ-02', cemiterio: { id: 1, nome: 'Cemitério Central' } },
    falecido: 'Maria de Souza',
  },
];

const mockInumacoes: Inumacao[] = [
  {
    id: 201,
    deceased_id: 1,
    plot_id: 1,
    gaveta_numero: 1,
    sepultado_em: '2026-09-10T10:00:00Z',
    situacao: 'confirmada',
    origem: 'registro_civil',
    revisao_pendente: false,
    livro_referencia: null,
    carencia_desde: '2026-09-10',
    service_order_id: 101,
    falecido: {
      id: 1,
      nome: 'José da Silva',
      nascimento: '1950-01-01',
      falecimento: '2026-09-08',
      idade_obito: 76,
      certidao_numero: '123456',
    },
    jazigo: { id: 1, codigo: 'JAZ-01' },
  },
];

const mockExumacoes: Exumacao[] = [
  {
    id: 301,
    burial_id: 201,
    tipo: 'ordinaria',
    situacao: 'liberada',
    prazo_aplicado_anos: 3,
    liberada_em: '2026-09-20',
    motivo_suspensao: null,
    inumacao: mockInumacoes[0],
  },
];

const mockTrasladacoes: Trasladacao[] = [
  {
    id: 401,
    burial_id: 201,
    plot_origem_id: 1,
    plot_destino_id: 2,
    destino_externo: null,
    documento_destino: null,
    situacao: 'concluida',
    service_order_id: 102,
    created_at: '2026-09-25T11:00:00Z',
    inumacao: mockInumacoes[0],
    jazigoOrigem: { id: 1, codigo: 'JAZ-01' },
    jazigoDestino: { id: 2, codigo: 'JAZ-02' },
  },
];

describe('OperacoesViewEvolucao Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(cemiteriosApi, 'parques').mockResolvedValue([]);
    vi.spyOn(cemiteriosApi, 'ordens').mockResolvedValue({
      data: mockOrdens,
      current_page: 1,
      last_page: 1,
      total: mockOrdens.length,
    });
    vi.spyOn(cemiteriosApi, 'inumacoes').mockResolvedValue({
      data: mockInumacoes,
      current_page: 1,
      last_page: 1,
      total: mockInumacoes.length,
    });
    vi.spyOn(cemiteriosApi, 'exumacoes').mockResolvedValue({
      data: mockExumacoes,
      current_page: 1,
      last_page: 1,
      total: mockExumacoes.length,
    });
    vi.spyOn(cemiteriosApi, 'trasladacoes').mockResolvedValue({
      data: mockTrasladacoes,
      current_page: 1,
      last_page: 1,
      total: mockTrasladacoes.length,
    });
    vi.spyOn(cemiteriosApi, 'pdfOrdem').mockResolvedValue(undefined as never);
  });

  it('renderiza os KPIs operacionais consolidados no topo da aba', async () => {
    render(
      <CemiteriosProvider>
        <OperacoesView />
      </CemiteriosProvider>
    );

    // Verifica rótulos dos cards
    await waitFor(() => {
      expect(screen.getByText(/OS em Aberto/i)).toBeInTheDocument();
      expect(screen.getByText(/Agendadas para Hoje/i)).toBeInTheDocument();
      expect(screen.getByText(/Inumações no Mês/i)).toBeInTheDocument();
      expect(screen.getByText(/Exumações Ativas/i)).toBeInTheDocument();
      expect(screen.getByText(/OS Concluídas/i)).toBeInTheDocument();
    });
  });

  it('exibe a lista de Ordens de Serviço em modo Tabela estruturada por padrão', async () => {
    render(
      <CemiteriosProvider>
        <OperacoesView />
      </CemiteriosProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('42/2026')).toBeInTheDocument();
      expect(screen.getByText('José da Silva')).toBeInTheDocument();
      expect(screen.getByText('JAZ-01')).toBeInTheDocument();
    });
  });

  it('permite alternar para modo de visualização em Cartões de campo', async () => {
    render(
      <CemiteriosProvider>
        <OperacoesView />
      </CemiteriosProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cartões/i })).toBeInTheDocument();
    });

    const btnCards = screen.getByRole('button', { name: /Cartões/i });
    fireEvent.click(btnCards);

    // No modo cards, o texto OS 42/2026 é exibido
    await waitFor(() => {
      expect(screen.getByText('OS 42/2026')).toBeInTheDocument();
    });
  });

  it('abre o modal detalhado da Ordem de Serviço ao clicar em Detalhes', async () => {
    render(
      <CemiteriosProvider>
        <OperacoesView />
      </CemiteriosProvider>
    );

    await waitFor(() => {
      const botoesDetalhes = screen.getAllByRole('button', { name: /Detalhes/i });
      expect(botoesDetalhes.length).toBeGreaterThan(0);
      fireEvent.click(botoesDetalhes[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/Ordem de Serviço Nº 42\/2026/i)).toBeInTheDocument();
      expect(screen.getByText(/Aguardando cortejo/i)).toBeInTheDocument();
      expect(screen.getByText(/Emitir Guia em PDF/i)).toBeInTheDocument();
    });
  });

  it('navega para a aba de Trasladações e exibe a tabela correspondente', async () => {
    render(
      <CemiteriosProvider>
        <OperacoesView />
      </CemiteriosProvider>
    );

    const abaTrasladacoes = screen.getByRole('tab', { name: /Trasladações/i });
    fireEvent.click(abaTrasladacoes);

    await waitFor(() => {
      expect(screen.getByText(/Túmulo de Origem/i)).toBeInTheDocument();
      expect(screen.getByText(/Destino da Trasladação/i)).toBeInTheDocument();
    });
  });
});
