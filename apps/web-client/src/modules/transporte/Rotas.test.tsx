import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const api = vi.hoisted(() => ({
  paradas: vi.fn(), salvarParada: vi.fn(), excluirParada: vi.fn(),
  rotas: vi.fn(), salvarRota: vi.fn(), excluirRota: vi.fn(),
  itinerario: vi.fn(), adicionarParada: vi.fn(), removerParada: vi.fn(), reordenarItinerario: vi.fn(), horariosDaParada: vi.fn(),
}));
vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), transporteApi: api }));
// O Leaflet não roda no jsdom: o mapa é testado pelos pontos que recebe.
vi.mock('./components/MapaLeaflet', () => ({
  MapaItinerarioLeaflet: ({ pontos }: { pontos: { ordem: number; nome: string }[] }) => (
    <div data-testid="mapa-itinerario">{pontos.map((p) => <span key={p.ordem}>marcador {p.ordem} {p.nome}</span>)}</div>
  ),
  SeletorCoordenadaLeaflet: ({ aoEscolher }: { aoEscolher: (lat: number, lng: number) => void }) => (
    <button onClick={() => aoEscolher(-25.43, -49.27)}>clique no mapa</button>
  ),
}));

import type { ItemItinerario, Opcoes, Parada, Rota } from './api';
import { km } from './formato';
import { pontosDoMapa } from './components/MapaItinerario';
import { Paradas } from './components/Paradas';
import { Rotas } from './components/Rotas';

Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const opcoes = (gerenciar = true): Opcoes => ({
  tipos_empresa: [], origens: [], tipos_rede: [{ valor: 'rural', rotulo: 'Rural' }],
  turnos: [{ valor: 'manha', rotulo: 'Manhã' }, { valor: 'tarde', rotulo: 'Tarde' }],
  escolas: [{ id: 5, nome: 'Escola Rio Claro' }], anos_letivos: [2026, 2025],
  veiculos: [{ id: 1, placa: 'ABC1D23', descricao: 'Ônibus 01' }],
  poderes_publicos: [], mediacoes: [], categorias_cnh: ['D'], tipologias: [], empresas: [], motoristas: [{ id: 2, nome: 'João da Silva' }],
  permissoes: { gerenciar_frota: gerenciar, gerenciar_rotas: gerenciar, gerenciar_alocacoes: gerenciar, exceder_capacidade: false, exportar_censo: true, auditar: false },
});

const parada = (extra: Partial<Parada> = {}): Parada => ({
  id: 10, nome: 'Ponte do Rio', descricao: null, latitude: -25.43, longitude: -49.27, tem_coordenadas: true, cep: null, logradouro: 'Estrada Velha',
  numero: null, complemento: null, bairro: 'Zona Rural', cidade: 'Rio Claro', uf: 'PR', referencia: null, ativa: true, ...extra,
});

const rota = (extra: Partial<Rota> = {}): Rota => ({
  id: 7, nome: 'Rota Norte', escola: { id: 5, nome: 'Escola Rio Claro' }, ano_letivo: 2026, turno: 'manha', turno_rotulo: 'Manhã', tipo_rede: 'rural',
  empresa: null, veiculo: { id: 1, placa: 'ABC1D23', descricao: 'Ônibus 01' }, motorista: { id: 2, nome: 'João da Silva' },
  km_pavimentado: 12.5, km_nao_pavimentado: 7.25, km_total: 19.75, horario_saida: '06:30', horario_chegada: null, horario_retorno: null,
  ativa: true, paradas_count: 3, ocupacao: { alocados: 20, capacidade: 40, percentual: 50, faixa: 'verde', calculavel: true }, regular: true, motivos_irregularidade: [], observacoes: null, ...extra,
});

const item = (ordem: number, p: Partial<Parada> = {}): ItemItinerario => ({
  ordem, embarque_previsto: null, desembarque_previsto: null, parada: parada({ id: 10 + ordem, nome: `Parada ${ordem}`, ...p }),
});

const pagina = <T,>(data: T[]) => ({ data, current_page: 1, last_page: 1, total: data.length });

beforeEach(() => vi.clearAllMocks());

describe('Formatação', () => {
  it('quilometragem em pt-BR', () => {
    expect(km(19.75)).toBe('19,75 km');
    expect(km(0)).toBe('0,00 km');
  });
});

describe('Pontos do mapa', () => {
  it('descarta paradas sem coordenada e mantém a ordem do itinerário', () => {
    const itens = [item(1), item(2, { latitude: null, longitude: null, tem_coordenadas: false }), item(3)];
    expect(pontosDoMapa(itens).map((p) => p.ordem)).toEqual([1, 3]);
  });
});

describe('Paradas', () => {
  it('lista com o aviso de sem coordenada', async () => {
    api.paradas.mockResolvedValue(pagina([parada(), parada({ id: 11, nome: 'Sem GPS', latitude: null, longitude: null, tem_coordenadas: false })]));
    render(<Paradas opcoes={opcoes()} avisar={vi.fn()} />);

    expect(await screen.findByText('Ponte do Rio')).toBeInTheDocument();
    expect(screen.getByText('sem coordenada')).toBeInTheDocument();
  });

  it('consulta não vê o botão de nova parada', async () => {
    api.paradas.mockResolvedValue(pagina([parada()]));
    render(<Paradas opcoes={opcoes(false)} avisar={vi.fn()} />);

    expect(await screen.findByText('Ponte do Rio')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nova parada/ })).not.toBeInTheDocument();
  });

  it('exige o nome e as duas coordenadas juntas', async () => {
    api.paradas.mockResolvedValue(pagina([]));
    render(<Paradas opcoes={opcoes()} avisar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Nova parada/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe o nome da parada.')).toBeInTheDocument();
    expect(api.salvarParada).not.toHaveBeenCalled();
  });

  it('coordenada marcada no mapa preenche latitude e longitude e vai no envio', async () => {
    api.paradas.mockResolvedValue(pagina([]));
    api.salvarParada.mockResolvedValue(parada());
    render(<Paradas opcoes={opcoes()} avisar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Nova parada/ }));
    fireEvent.change(await screen.findByLabelText('Nome *'), { target: { value: 'Ponto novo' } });
    fireEvent.click(screen.getByRole('button', { name: /Marcar no mapa/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'clique no mapa' }));
    expect(screen.getByLabelText('Latitude')).toHaveValue('-25.43');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.salvarParada).toHaveBeenCalled());
    expect(api.salvarParada).toHaveBeenCalledWith(null, expect.objectContaining({ nome: 'Ponto novo', latitude: -25.43, longitude: -49.27, ativa: true }));
  });

  it('pode salvar sem coordenadas', async () => {
    api.paradas.mockResolvedValue(pagina([]));
    api.salvarParada.mockResolvedValue(parada());
    render(<Paradas opcoes={opcoes()} avisar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Nova parada/ }));
    fireEvent.change(await screen.findByLabelText('Nome *'), { target: { value: 'Ponto sem GPS' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.salvarParada).toHaveBeenCalled());
    expect(api.salvarParada).toHaveBeenCalledWith(null, expect.objectContaining({ latitude: null, longitude: null }));
  });
});

describe('Rotas', () => {
  it('mostra o total de km, a contagem de paradas e o selo de irregular com os motivos', async () => {
    api.rotas.mockResolvedValue(pagina([rota({ regular: false, motivos_irregularidade: ['vistoria_vencida', 'toxicologico_vencido'] })]));
    render(<Rotas opcoes={opcoes()} avisar={vi.fn()} />);

    expect(await screen.findByText('Rota Norte')).toBeInTheDocument();
    expect(screen.getByText('19,75 km')).toBeInTheDocument();
    expect(screen.getByText('Irregular')).toBeInTheDocument();
    expect(screen.getByText('Vistoria vencida; Exame toxicológico vencido')).toBeInTheDocument();
  });

  it('consulta não vê o botão de nova rota', async () => {
    api.rotas.mockResolvedValue(pagina([rota()]));
    render(<Rotas opcoes={opcoes(false)} avisar={vi.fn()} />);

    expect(await screen.findByText('Rota Norte')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nova rota/ })).not.toBeInTheDocument();
  });

  it('exige nome e mostra o total de km enquanto digita', async () => {
    api.rotas.mockResolvedValue(pagina([]));
    render(<Rotas opcoes={opcoes()} avisar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Nova rota/ }));
    fireEvent.change(await screen.findByLabelText('Km pavimentados'), { target: { value: '12,5' } });
    fireEvent.change(screen.getByLabelText('Km não pavimentados'), { target: { value: '7,25' } });
    expect(screen.getByText('19,75 km')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o nome da rota.')).toBeInTheDocument();
    expect(api.salvarRota).not.toHaveBeenCalled();
  });

  it('envia a rota com escola, ano, turno e quilometragens numéricas', async () => {
    api.rotas.mockResolvedValue(pagina([]));
    api.salvarRota.mockResolvedValue(rota());
    render(<Rotas opcoes={opcoes()} avisar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Nova rota/ }));
    fireEvent.change(await screen.findByLabelText('Nome *'), { target: { value: 'Rota Sul' } });
    fireEvent.change(screen.getByLabelText('Km pavimentados'), { target: { value: '12,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.salvarRota).toHaveBeenCalled());
    expect(api.salvarRota).toHaveBeenCalledWith(null, expect.objectContaining({
      nome: 'Rota Sul', escola_id: 5, ano_letivo: 2026, turno: 'manha', veiculo_id: null, motorista_id: null, empresa_id: null, km_pavimentado: 12.5, km_nao_pavimentado: 0,
    }));
  });

  it('erro de regularidade da API aparece no formulário', async () => {
    api.rotas.mockResolvedValue(pagina([]));
    api.salvarRota.mockRejectedValue({ response: { status: 409, data: { error: 'Veículo ABC1D23 está com a vistoria vencida em 30/10/2026.' } } });
    render(<Rotas opcoes={opcoes()} avisar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Nova rota/ }));
    fireEvent.change(await screen.findByLabelText('Nome *'), { target: { value: 'Rota Sul' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Veículo ABC1D23 está com a vistoria vencida em 30/10/2026.')).toBeInTheDocument();
  });
});

describe('Itinerário', () => {
  const abrir = async (itens: ItemItinerario[], podeEditar = true) => {
    api.rotas.mockResolvedValue(pagina([rota()]));
    api.itinerario.mockResolvedValue(itens);
    api.paradas.mockResolvedValue(pagina([parada({ id: 99, nome: 'Parada livre' })]));
    render(<Rotas opcoes={opcoes(podeEditar)} avisar={vi.fn()} />);
    // O menu do Radix abre por teclado no jsdom.
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Ações da rota Rota Norte' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Itinerário e mapa' }));
    return screen.findByRole('list', { name: 'Paradas do itinerário' });
  };

  it('mostra as paradas na ordem, o mapa com marcadores e a lista dos sem coordenada', async () => {
    const lista = await abrir([item(1), item(2, { latitude: null, longitude: null, tem_coordenadas: false }), item(3)]);

    expect(within(lista).getAllByRole('listitem')).toHaveLength(3);
    const mapa = await screen.findByTestId('mapa-itinerario');
    expect(within(mapa).getByText('marcador 1 Parada 1')).toBeInTheDocument();
    expect(within(mapa).getByText('marcador 3 Parada 3')).toBeInTheDocument();
    expect(within(mapa).queryByText(/marcador 2/)).not.toBeInTheDocument();
    const lateral = screen.getByRole('complementary', { name: 'Paradas sem coordenada' });
    expect(within(lateral).getByText('Parada 2')).toBeInTheDocument();
  });

  it('descer uma parada envia a lista completa na nova ordem', async () => {
    api.reordenarItinerario.mockResolvedValue([item(2), item(1)]);
    await abrir([item(1), item(2)]);

    fireEvent.click(screen.getByRole('button', { name: 'Descer Parada 1' }));

    await waitFor(() => expect(api.reordenarItinerario).toHaveBeenCalledWith(7, [12, 11]));
  });

  it('o primeiro não sobe e o último não desce', async () => {
    await abrir([item(1), item(2)]);

    expect(screen.getByRole('button', { name: 'Subir Parada 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descer Parada 2' })).toBeDisabled();
  });

  it('remover chama a API da rota', async () => {
    api.removerParada.mockResolvedValue([item(1)]);
    await abrir([item(1), item(2)]);

    fireEvent.click(screen.getByRole('button', { name: 'Remover Parada 2' }));

    await waitFor(() => expect(api.removerParada).toHaveBeenCalledWith(7, 12));
  });

  it('consulta vê o itinerário sem os controles de edição', async () => {
    await abrir([item(1), item(2)], false);

    expect(screen.queryByRole('button', { name: 'Subir Parada 2' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Adicionar/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('mapa-itinerario')).toBeInTheDocument();
  });
});
