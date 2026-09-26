import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InventarioView } from '../InventarioView';
import { cemiteriosApi, type Jazigo, type Parque } from '../../api';

vi.mock('@/core/rbac/useCan', () => ({
  useCan: () => ({
    can: () => true,
    cannot: () => false,
  }),
}));

const mockParques: Parque[] = [
  {
    id: 1,
    codigo: 'CEM-01',
    nome: 'Cemitério Municipal',
    endereco: 'Rua Principal, 123',
    tipo: 'municipal',
    situacao: 'ativo',
    responsavel: 'Gestor',
    lat: null,
    lng: null,
    setores: [
      { id: 10, park_id: 1, codigo: 'Q-01', descricao: 'Quadra 1', tipo_zona: 'jazigos', area_m2: 200 },
    ],
  },
];

const mockJazigos: Jazigo[] = [
  {
    id: 1,
    park_id: 1,
    sector_id: 10,
    codigo: 'JAZ-001',
    tipo: 'jazigo',
    capacidade: 3,
    ocupacao: 1,
    estado: 'concedido',
    comprimento_m: 2.2,
    largura_m: 1.0,
    lat: -23.55052,
    lng: -46.633308,
    lock_version: 1,
    setor: { id: 10, park_id: 1, codigo: 'Q-01', descricao: 'Quadra 1', tipo_zona: 'jazigos', area_m2: 200 },
    cemiterio: mockParques[0],
  },
];

describe('InventarioView Component', () => {
  beforeEach(() => {
    vi.spyOn(cemiteriosApi, 'parques').mockResolvedValue(mockParques);
    vi.spyOn(cemiteriosApi, 'parque').mockResolvedValue(mockParques[0]);
    vi.spyOn(cemiteriosApi, 'jazigos').mockResolvedValue({
      data: mockJazigos,
      current_page: 1,
      last_page: 1,
      total: 1,
    });
    vi.spyOn(cemiteriosApi, 'historico').mockResolvedValue([]);
    vi.spyOn(cemiteriosApi, 'concessoes').mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });
    vi.spyOn(cemiteriosApi, 'inumacoes').mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });
    vi.spyOn(cemiteriosApi, 'vistorias').mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });
    vi.spyOn(cemiteriosApi, 'guias').mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });
  });

  it('renderiza os painéis de KPIs, filtros avançados e botões de gestão', async () => {
    render(<InventarioView />);

    // Verifica KPIs
    expect(await screen.findByText('Total de Unidades')).toBeInTheDocument();
    expect(screen.getByText('Disponíveis')).toBeInTheDocument();
    expect(screen.getByText('Concedidas')).toBeInTheDocument();
    expect(screen.getByText('Em Uso / Ocupadas')).toBeInTheDocument();

    // Verifica Botões de Ação
    const btnSetor = screen.getByRole('button', { name: /novo setor\/quadra/i });
    const btnJazigo = screen.getByRole('button', { name: /novo jazigo/i });
    expect(screen.getByRole('button', { name: /novo cemitério/i })).toBeInTheDocument();
    expect(btnSetor).toBeInTheDocument();
    expect(btnSetor).not.toBeDisabled();
    expect(btnJazigo).toBeInTheDocument();
    expect(btnJazigo).not.toBeDisabled();

    // Verifica Tabela
    expect(await screen.findByText('JAZ-001')).toBeInTheDocument();
    expect(screen.getByText('Cemitério Municipal')).toBeInTheDocument();
    expect(screen.getByText('Q-01')).toBeInTheDocument();
  });

  it('permite abrir o modal de Novo Setor mesmo sem cemitério filtrado e fechá-lo', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(<InventarioView />);

    const btnSetor = await screen.findByRole('button', { name: /novo setor\/quadra/i });
    expect(btnSetor).not.toBeDisabled();
    fireEvent.click(btnSetor);

    // O modal deve ser exibido com campo de Cemitério Municipal
    expect(await screen.findByText('Cemitério Municipal', { selector: 'label' })).toBeInTheDocument();

    // Fecha o modal via botão Cancelar
    const btnCancelar = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(btnCancelar);
  }, 15000);

  it('permite abrir o modal de Novo Jazigo com setores disponíveis e fechá-lo', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(<InventarioView />);

    const btnJazigo = await screen.findByRole('button', { name: /novo jazigo/i });
    expect(btnJazigo).not.toBeDisabled();
    fireEvent.click(btnJazigo);

    // O modal deve ser exibido com o título
    expect(await screen.findByText('Nova Unidade de Sepultamento')).toBeInTheDocument();

    // Fecha o modal via botão Cancelar
    const btnCancelar = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(btnCancelar);
  }, 15000);

  it('isola os dados e oculta botão Novo Cemitério quando há necrópole ativa no contexto', async () => {
    const { CemiteriosProvider } = await import('../../CemiteriosContext');

    render(
      <CemiteriosProvider
        cemiteriosIniciais={mockParques}
        cemiterioAtivoIdInicial={1}
        modoVisaoInicial="gestao_necropole"
      >
        <InventarioView />
      </CemiteriosProvider>
    );

    // O botão "+ Novo Cemitério" NÃO deve estar no documento
    expect(screen.queryByRole('button', { name: /novo cemitério/i })).not.toBeInTheDocument();

    // O subtítulo deve indicar inventário operacional exclusivo
    const subtitulo = await screen.findByText(/inventário operacional exclusivo:/i);
    expect(subtitulo).toBeInTheDocument();
    expect(subtitulo).toHaveTextContent('Cemitério Municipal');

    // O seletor dropdown global de Cemitério não deve existir nos filtros
    expect(screen.queryByText(/cemitério \/ necrópole/i)).not.toBeInTheDocument();

    // A chamada a jazigos deve ter ocorrido com o parque ativo travado
    expect(cemiteriosApi.jazigos).toHaveBeenCalledWith(
      expect.objectContaining({
        parque: '1',
      })
    );
  }, 15000);

  it('abre as informações do túmulo ao clicar no botão Ver Túmulo na listagem', async () => {
    const { fireEvent } = await import('@testing-library/react');
    vi.spyOn(cemiteriosApi, 'jazigo').mockResolvedValue(mockJazigos[0]);

    render(<InventarioView />);

    // Localiza o botão "Ver Túmulo" na coluna de Ações
    const btnVerTumulo = await screen.findByRole('button', { name: /ver túmulo/i });
    expect(btnVerTumulo).toBeInTheDocument();

    fireEvent.click(btnVerTumulo);

    // O ModalDetalheJazigo deve abrir exibindo as informações detalhadas e sub-abas
    expect(await screen.findByText(/informações do túmulo — JAZ-001/i)).toBeInTheDocument();
    expect(screen.getByText(/dimensões & área/i)).toBeInTheDocument();
    expect(screen.getByText(/financeiro & taxas/i)).toBeInTheDocument();
  }, 15000);

  it('abre as informações do túmulo ao clicar diretamente no código do jazigo', async () => {
    const { fireEvent } = await import('@testing-library/react');
    vi.spyOn(cemiteriosApi, 'jazigo').mockResolvedValue(mockJazigos[0]);

    render(<InventarioView />);

    // Clica no código JAZ-001
    const btnCodigo = await screen.findByRole('button', { name: /JAZ-001/i });
    expect(btnCodigo).toBeInTheDocument();

    fireEvent.click(btnCodigo);

    // O Drawer deve abrir
    expect(await screen.findByText(/informações do túmulo — JAZ-001/i)).toBeInTheDocument();
  }, 15000);
});
