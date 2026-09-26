import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModalDetalheJazigo } from '../ModalDetalheJazigo';
import { cemiteriosApi, type Jazigo, type Concessao, type Inumacao, type Guia } from '../../api';

vi.mock('@/core/rbac/useCan', () => ({
  useCan: () => ({
    can: () => true,
    cannot: () => false,
  }),
}));

const mockJazigo: Jazigo = {
  id: 101,
  park_id: 1,
  sector_id: 10,
  codigo: 'JAZ-101',
  tipo: 'jazigo',
  capacidade: 3,
  ocupacao: 1,
  estado: 'concedido',
  comprimento_m: 2.2,
  largura_m: 1.0,
  lat: -23.55052,
  lng: -46.633308,
  lock_version: 1,
  cemiterio: {
    id: 1,
    codigo: 'CEM-01',
    nome: 'Cemitério da Saudade',
    endereco: 'Rua das Flores, 100',
    tipo: 'municipal',
    situacao: 'ativo',
    responsavel: 'Carlos Silva',
    lat: null,
    lng: null,
  },
  setor: {
    id: 10,
    park_id: 1,
    codigo: 'QUADRA-A',
    descricao: 'Quadra Central',
    tipo_zona: 'jazigos',
    area_m2: 500,
  },
};

const mockConcessoes: Concessao[] = [
  {
    id: 1,
    numero: 'CONC-2026/042',
    plot_id: 101,
    holder_id: 5,
    modalidade: 'perpetua',
    inicio: '2020-01-15',
    termino: null,
    situacao: 'regular',
    pendencia_regularizacao: false,
    concessionario: {
      id: 5,
      nome: 'Maria de Lurdes Silveira',
      tipo_doc: 'cpf',
      documento_mascarado: '***.456.789-**',
      telefone: '(11) 98765-4321',
      email: 'maria@example.com',
      endereco: 'Av. Paulista, 1000, Bela Vista, São Paulo - SP',
      base_legal: 'Artigo 42 da Lei 1234',
      titular_falecido: false,
    },
  },
];

const mockInumacoes: Inumacao[] = [
  {
    id: 1,
    deceased_id: 10,
    plot_id: 101,
    sepultado_em: '2021-05-10',
    situacao: 'sepultado',
    origem: 'declaracao',
    revisao_pendente: false,
    gaveta_numero: 1,
    livro_referencia: 'Livro 12, fls 45',
    carencia_desde: '2021-05-10',
    service_order_id: null,
    coveiro_nome: 'João Coveiro',
    pedreiro_nome: 'Marcos Pedreiro',
    medico: 'Dr. Roberto Alves - CRM 54321/SP',
    cartorio: '1º Cartório de Registro Civil',
    falecido: {
      id: 10,
      nome: 'Sebastião Silveira',
      nascimento: '1940-02-12',
      falecimento: '2021-05-08',
      idade_obito: 81,
      certidao_numero: 'CERT-884920',
      certidao_cartorio: '1º Cartório de Registro Civil',
    },
  },
];

const mockGuias: Guia[] = [
  {
    id: 501,
    numero: 'DAM-2025-001',
    contribuinte_nome: 'Maria de Lurdes Silveira',
    servico: 'taxa_manutencao_anual',
    exercicio: 2025,
    vencimento: '2025-12-31',
    valor_centavos: 15000,
    situacao: 'paga',
    valor_pago_centavos: 15000,
    pago_em: '2025-11-10',
    vencida: false,
    original_id: null,
  },
  {
    id: 502,
    numero: 'DAM-2026-002',
    contribuinte_nome: 'Maria de Lurdes Silveira',
    servico: 'taxa_manutencao_anual',
    exercicio: 2026,
    vencimento: '2026-01-15',
    valor_centavos: 16500,
    situacao: 'emitida',
    vencida: true,
    original_id: null,
    pago_em: null,
  },
];

describe('ModalDetalheJazigo Component', () => {
  beforeEach(() => {
    vi.spyOn(cemiteriosApi, 'jazigo').mockResolvedValue(mockJazigo);
    vi.spyOn(cemiteriosApi, 'historico').mockResolvedValue([]);
    vi.spyOn(cemiteriosApi, 'concessoes').mockResolvedValue({
      data: mockConcessoes,
      current_page: 1,
      last_page: 1,
      total: 1,
    });
    vi.spyOn(cemiteriosApi, 'inumacoes').mockResolvedValue({
      data: mockInumacoes,
      current_page: 1,
      last_page: 1,
      total: 1,
    });
    vi.spyOn(cemiteriosApi, 'vistorias').mockResolvedValue({
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
    });
    vi.spyOn(cemiteriosApi, 'guias').mockResolvedValue({
      data: mockGuias,
      current_page: 1,
      last_page: 1,
      total: 2,
    });
  });

  it('renderiza o modal com cabeçalho, ações rápidas e sub-abas temáticas', async () => {
    render(
      <ModalDetalheJazigo
        jazigo={{ id: 101 }}
        onFechar={vi.fn()}
      />
    );

    // Título e cabeçalho
    expect(await screen.findByText(/Informações do Túmulo — JAZ-101/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ficha cadastral/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /plaqueta qr code/i })).toBeInTheDocument();

    // Sub-abas
    expect(screen.getByRole('button', { name: /visão geral & físico/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /concessão & titulares/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sepultados/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /financeiro & taxas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /vistorias & histórico/i })).toBeInTheDocument();

    // Badge de inadimplência devido a guia vencida
    expect(await screen.findByText(/inadimplente/i)).toBeInTheDocument();
  });

  it('navega para a sub-aba Concessão e exibe dados do termo e concessionário', async () => {
    render(
      <ModalDetalheJazigo
        jazigo={{ id: 101 }}
        onFechar={vi.fn()}
      />
    );

    await screen.findByText(/Informações do Túmulo — JAZ-101/i);

    const btnAbaConcessao = screen.getByRole('button', { name: /concessão & titulares/i });
    fireEvent.click(btnAbaConcessao);

    expect(await screen.findByText('CONC-2026/042')).toBeInTheDocument();
    expect(screen.getByText('Maria de Lurdes Silveira')).toBeInTheDocument();
    expect(screen.getByText(/perpetua/i)).toBeInTheDocument();
    expect(screen.getByText(/Av. Paulista, 1000/i)).toBeInTheDocument();
    expect(screen.getByText('(11) 98765-4321')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar titular/i })).toBeInTheDocument();
  });

  it('navega para a sub-aba Sepultados e exibe a lista de inumados', async () => {
    render(
      <ModalDetalheJazigo
        jazigo={{ id: 101 }}
        onFechar={vi.fn()}
      />
    );

    await screen.findByText(/Informações do Túmulo — JAZ-101/i);

    const btnAbaOcupantes = screen.getByRole('button', { name: /sepultados/i });
    fireEvent.click(btnAbaOcupantes);

    expect(await screen.findByText('Sebastião Silveira')).toBeInTheDocument();
    expect(screen.getByText(/Gaveta 1/i)).toBeInTheDocument();
    expect(screen.getByText(/CERT-884920/i)).toBeInTheDocument();
    expect(screen.getByText(/Dr. Roberto Alves/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar sepultado/i })).toBeInTheDocument();
  });

  it('navega para a sub-aba Financeiro e exibe métricas e tabela de guias DAM com download de PDF', async () => {
    const pdfSpy = vi.spyOn(cemiteriosApi, 'pdfGuia').mockResolvedValue(undefined);

    render(
      <ModalDetalheJazigo
        jazigo={{ id: 101 }}
        onFechar={vi.fn()}
      />
    );

    await screen.findByText(/Informações do Túmulo — JAZ-101/i);

    const btnAbaFinanceiro = screen.getByRole('button', { name: /financeiro & taxas/i });
    fireEvent.click(btnAbaFinanceiro);

    // Cards financeiros
    expect(await screen.findByText(/Total Lançado \(DAM\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Pago \/ Arrecadado/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Pendente \/ Vencido/i)).toBeInTheDocument();

    // Valores em JetBrains Mono (R$)
    expect(screen.getByText('R$ 315.00')).toBeInTheDocument(); // 150 + 165
    expect(screen.getAllByText('R$ 150.00').length).toBeGreaterThanOrEqual(1); // pago (card + tabela)
    expect(screen.getAllByText('R$ 165.00').length).toBeGreaterThanOrEqual(1); // pendente (card + tabela)

    // Linhas da tabela
    expect(screen.getByText('DAM-2025-001')).toBeInTheDocument();
    expect(screen.getByText('DAM-2026-002')).toBeInTheDocument();

    // Download de PDF
    const botoesPdf = screen.getAllByRole('button', { name: /pdf/i });
    fireEvent.click(botoesPdf[0]);
    expect(pdfSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 501 }));
  });

  it('permite solicitar 2ª via de guia vencida na sub-aba Financeiro', async () => {
    const segundaViaSpy = vi.spyOn(cemiteriosApi, 'segundaVia').mockResolvedValue(mockGuias[1]);

    render(
      <ModalDetalheJazigo
        jazigo={{ id: 101 }}
        onFechar={vi.fn()}
      />
    );

    await screen.findByText(/Informações do Túmulo — JAZ-101/i);

    const btnAbaFinanceiro = screen.getByRole('button', { name: /financeiro & taxas/i });
    fireEvent.click(btnAbaFinanceiro);

    const btnSegundaVia = await screen.findByRole('button', { name: /2ª via/i });
    expect(btnSegundaVia).toBeInTheDocument();

    fireEvent.click(btnSegundaVia);
    expect(segundaViaSpy).toHaveBeenCalledWith(502);
  });

  it('permite abrir o modal de edição de informações do túmulo e salvar alterações', async () => {
    const atualizarSpy = vi.spyOn(cemiteriosApi, 'atualizarJazigo').mockResolvedValue({
      ...mockJazigo,
      codigo: 'JAZ-101-NOVO',
      capacidade: 4,
    });

    render(
      <ModalDetalheJazigo
        jazigo={{ id: 101 }}
        onFechar={vi.fn()}
      />
    );

    await screen.findByText(/Informações do Túmulo — JAZ-101/i);

    const btnEditarTumulo = screen.getByRole('button', { name: /editar túmulo/i });
    expect(btnEditarTumulo).toBeInTheDocument();
    fireEvent.click(btnEditarTumulo);

    expect(await screen.findByText(/Editar Informações do Túmulo — JAZ-101/i)).toBeInTheDocument();

    const inputCodigo = screen.getByDisplayValue('JAZ-101');
    fireEvent.change(inputCodigo, { target: { value: 'JAZ-101-NOVO' } });

    const btnSalvar = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(atualizarSpy).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          codigo: 'JAZ-101-NOVO',
        })
      );
    });
  });

  it('permite abrir a edição do titular com busca por CEP e campos de endereço estruturados', async () => {
    vi.spyOn(cemiteriosApi, 'titular').mockResolvedValue({
      ...mockConcessoes[0].concessionario!,
      documento: '12345678900',
    } as any);

    render(
      <ModalDetalheJazigo
        jazigo={{ id: 101 }}
        onFechar={vi.fn()}
      />
    );

    await screen.findByText(/Informações do Túmulo — JAZ-101/i);

    const btnAbaConcessao = screen.getByRole('button', { name: /concessão & titulares/i });
    fireEvent.click(btnAbaConcessao);

    const btnEditarTitular = await screen.findByRole('button', { name: /editar titular/i });
    fireEvent.click(btnEditarTitular);

    expect(await screen.findByText(/Editar Dados do Titular Concessionário/i)).toBeInTheDocument();
    expect(screen.getByText(/Endereço Residencial do Titular/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('00000-000')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nome da rua ou avenida')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: 123 ou S\/N/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buscar/i })).toBeInTheDocument();
  });

  it('permite abrir a edição de sepultado com CPF e campos completos de operação', async () => {
    render(
      <ModalDetalheJazigo
        jazigo={{ id: 101 }}
        onFechar={vi.fn()}
      />
    );

    await screen.findByText(/Informações do Túmulo — JAZ-101/i);

    const btnAbaOcupantes = screen.getByRole('button', { name: /sepultados/i });
    fireEvent.click(btnAbaOcupantes);

    const btnEditarSepultado = await screen.findByRole('button', { name: /editar sepultado/i });
    fireEvent.click(btnEditarSepultado);

    expect(await screen.findByText(/Editar Informações do Sepultado & Registro/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sebastião Silveira')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('000.000.000-00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CERT-884920')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Dr. Roberto Alves - CRM 54321/SP')).toBeInTheDocument();
  });
});
