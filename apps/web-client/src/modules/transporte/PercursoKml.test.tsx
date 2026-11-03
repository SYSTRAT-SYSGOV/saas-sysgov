import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const api = vi.hoisted(() => ({
  rotas: vi.fn(), previaPercurso: vi.fn(), gravarPercurso: vi.fn(), removerPercurso: vi.fn(), percurso: vi.fn(),
  itinerario: vi.fn(), paradas: vi.fn(),
}));
vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), transporteApi: api }));
// O Leaflet não roda no jsdom: o mapa é testado pelos traçados que recebe.
vi.mock('./components/MapaLeaflet', () => ({
  MapaItinerarioLeaflet: ({ percursos }: { percursos?: [number, number][][] }) => (
    <div data-testid="mapa-itinerario">{(percursos ?? []).map((t, i) => <span key={i}>traçado {t.length} pontos</span>)}</div>
  ),
  SeletorCoordenadaLeaflet: () => null,
}));

import type { Opcoes, PreviaKml, Rota } from './api';
import { ImportarPercursoKml } from './components/ImportarPercursoKml';
import { Rotas } from './components/Rotas';

Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const rota = (extra: Partial<Rota> = {}): Rota => ({
  id: 7, nome: 'Rota Norte', escola: { id: 5, nome: 'Escola Rio Claro' }, ano_letivo: 2026, turno: 'manha', turno_rotulo: 'Manhã', tipo_rede: 'rural',
  empresa: null, veiculo: null, motorista: null, km_pavimentado: 12.5, km_nao_pavimentado: 7.25, km_total: 19.75, horario_saida: null, horario_chegada: null, horario_retorno: null,
  ativa: true, paradas_count: 0, ocupacao: { alocados: 0, capacidade: null, percentual: null, faixa: null, calculavel: false }, regular: true, motivos_irregularidade: [],
  observacoes: null, caracteristicas: [], custo_contratado_mensal: null, tem_percurso: false, percurso_km: null, ...extra,
});

const opcoes = (gerenciar = true): Opcoes => ({
  tipos_empresa: [], origens: [], tipos_rede: [], turnos: [], escolas: [], anos_letivos: [2026], veiculos: [], poderes_publicos: [], mediacoes: [], categorias_cnh: [], tipologias: [],
  empresas: [], motoristas: [], caracteristicas_trecho: [], ramos_fornecedor: [], tipos_servico: [],
  permissoes: { gerenciar_frota: gerenciar, gerenciar_rotas: gerenciar, gerenciar_alocacoes: gerenciar, exceder_capacidade: false, exportar_censo: false, importar_censo: false, configurar_leiaute_censo: false, ver_custos: false, gerenciar_parametros_custo: false, ver_manutencao: false, gerenciar_manutencao: false, auditar: false },
});

// 0,1° de latitude = 11,12 km; 0,2° = 22,24 km.
const previa = (extra: Partial<PreviaKml> = {}): PreviaKml => ({
  arquivo: 'rota-norte.kml',
  linhas: [
    { indice: 0, nome: 'Trecho de ida', pontos_no_arquivo: 40, pontos: 2, km: 22.24, coordenadas: [[-23.0, -49.0], [-23.2, -49.0]] },
    { indice: 1, nome: 'Trecho final', pontos_no_arquivo: 10, pontos: 2, km: 11.12, coordenadas: [[-23.2, -49.0], [-23.3, -49.0]] },
  ],
  ignorados: { pontos: 2, poligonos: 0, pares_invalidos: 0, linhas_curtas: 0 },
  avisos: ['2 ponto(s) de interesse foram ignorados (só as linhas entram no percurso).'],
  ...extra,
});

const escolherArquivo = (nome = 'rota-norte.kml') => {
  const entrada = screen.getByLabelText('Arquivo KML ou KMZ') as HTMLInputElement;
  fireEvent.change(entrada, { target: { files: [new File(['<kml/>'], nome, { type: 'application/vnd.google-earth.kml+xml' })] } });
};

beforeEach(() => {
  vi.clearAllMocks();
  api.previaPercurso.mockResolvedValue(previa());
  api.gravarPercurso.mockResolvedValue({ km: 33.36, pontos: 3, km_pavimentado: 33.36, km_nao_pavimentado: 0, aplicou_km: true });
  api.percurso.mockResolvedValue(null);
  api.itinerario.mockResolvedValue([]);
  api.paradas.mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });
  api.rotas.mockResolvedValue({ data: [rota()], current_page: 1, last_page: 1, total: 1 });
});

describe('Importar percurso (KML)', () => {
  it('mostra a prévia com as linhas, os avisos e o total, sem gravar nada', async () => {
    render(<ImportarPercursoKml rota={rota()} aoFechar={vi.fn()} aoGravar={vi.fn()} />);
    escolherArquivo();

    const regiao = await screen.findByRole('region', { name: 'Prévia do percurso' });
    expect(api.previaPercurso).toHaveBeenCalledWith(7, expect.any(File));
    expect(within(regiao).getByText('Trecho de ida')).toBeInTheDocument();
    expect(within(regiao).getByText('Trecho final')).toBeInTheDocument();
    expect(within(regiao).getByText(/2 ponto\(s\) de interesse foram ignorados/)).toBeInTheDocument();
    expect(within(regiao).getByRole('status')).toHaveTextContent('33,36 km');
    expect(within(regiao).getByText('traçado 4 pontos')).toBeInTheDocument();
    expect(api.gravarPercurso).not.toHaveBeenCalled();
  });

  it('grava as coordenadas das linhas escolhidas, os km e a parte não pavimentada', async () => {
    const aoGravar = vi.fn();
    render(<ImportarPercursoKml rota={rota()} aoFechar={vi.fn()} aoGravar={aoGravar} />);
    escolherArquivo();
    await screen.findByRole('region', { name: 'Prévia do percurso' });

    fireEvent.change(screen.getByLabelText('Parte não pavimentada (km)'), { target: { value: '6,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gravar percurso' }));

    await waitFor(() => expect(api.gravarPercurso).toHaveBeenCalledWith(7, {
      coordenadas: [[-23.0, -49.0], [-23.2, -49.0], [-23.2, -49.0], [-23.3, -49.0]], aplicar_km: true, km_nao_pavimentado: 6.5,
    }));
    expect(aoGravar).toHaveBeenCalledWith(true);
  });

  it('desmarcar uma linha tira o trecho do total e do que é enviado', async () => {
    render(<ImportarPercursoKml rota={rota()} aoFechar={vi.fn()} aoGravar={vi.fn()} />);
    escolherArquivo();
    await screen.findByRole('region', { name: 'Prévia do percurso' });

    fireEvent.click(screen.getByRole('switch', { name: 'Usar a linha Trecho final' }));

    expect(screen.getByRole('status')).toHaveTextContent('22,24 km');
    fireEvent.click(screen.getByRole('button', { name: 'Gravar percurso' }));
    await waitFor(() => expect(api.gravarPercurso).toHaveBeenCalledWith(7, expect.objectContaining({ coordenadas: [[-23.0, -49.0], [-23.2, -49.0]] })));
  });

  it('inverter o sentido envia as coordenadas de trás para a frente', async () => {
    render(<ImportarPercursoKml rota={rota()} aoFechar={vi.fn()} aoGravar={vi.fn()} />);
    escolherArquivo();
    await screen.findByRole('region', { name: 'Prévia do percurso' });

    fireEvent.click(screen.getByRole('button', { name: /Inverter sentido/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Gravar percurso' }));

    await waitFor(() => expect(api.gravarPercurso).toHaveBeenCalledWith(7, expect.objectContaining({
      coordenadas: [[-23.3, -49.0], [-23.2, -49.0], [-23.2, -49.0], [-23.0, -49.0]],
    })));
  });

  it('sem atualizar os km, grava só o percurso', async () => {
    const aoGravar = vi.fn();
    render(<ImportarPercursoKml rota={rota()} aoFechar={vi.fn()} aoGravar={aoGravar} />);
    escolherArquivo();
    await screen.findByRole('region', { name: 'Prévia do percurso' });

    fireEvent.click(screen.getByRole('switch', { name: 'Atualizar os km da rota' }));
    expect(screen.queryByLabelText('Parte não pavimentada (km)')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gravar percurso' }));

    await waitFor(() => expect(api.gravarPercurso).toHaveBeenCalledWith(7, expect.objectContaining({ aplicar_km: false, km_nao_pavimentado: null })));
    expect(aoGravar).toHaveBeenCalledWith(false);
  });

  it('não deixa a parte não pavimentada passar do total', async () => {
    render(<ImportarPercursoKml rota={rota()} aoFechar={vi.fn()} aoGravar={vi.fn()} />);
    escolherArquivo();
    await screen.findByRole('region', { name: 'Prévia do percurso' });

    fireEvent.change(screen.getByLabelText('Parte não pavimentada (km)'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gravar percurso' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('não pode passar do total');
    expect(api.gravarPercurso).not.toHaveBeenCalled();
  });

  it('mostra o erro do servidor quando o arquivo é recusado', async () => {
    api.previaPercurso.mockRejectedValue({ response: { status: 422, data: { error: 'O arquivo declara um DOCTYPE, que não é aceito por segurança.' } } });
    render(<ImportarPercursoKml rota={rota()} aoFechar={vi.fn()} aoGravar={vi.fn()} />);
    escolherArquivo();

    expect(await screen.findByRole('alert')).toHaveTextContent('DOCTYPE');
    expect(screen.queryByRole('region', { name: 'Prévia do percurso' })).not.toBeInTheDocument();
  });

  it('avisa que gravar substitui o percurso que a rota já tem', () => {
    render(<ImportarPercursoKml rota={rota({ tem_percurso: true, percurso_km: 18.4 })} aoFechar={vi.fn()} aoGravar={vi.fn()} />);

    expect(screen.getByText(/já tem um percurso de/)).toBeInTheDocument();
  });
});

describe('Percurso na lista de rotas', () => {
  const abrirMenu = async (podeEditar: boolean, r: Rota = rota()) => {
    api.rotas.mockResolvedValue({ data: [r], current_page: 1, last_page: 1, total: 1 });
    render(<Rotas opcoes={opcoes(podeEditar)} avisar={vi.fn()} />);
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Ações da rota Rota Norte' }), { key: 'Enter' });
  };

  it('quem gerencia rotas vê a ação de importar; quem só consulta não', async () => {
    await abrirMenu(true);
    expect(await screen.findByRole('menuitem', { name: 'Importar percurso (KML)' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Remover percurso' })).not.toBeInTheDocument();
  });

  it('consulta não vê a ação', async () => {
    await abrirMenu(false);
    expect(await screen.findByRole('menuitem', { name: 'Itinerário e mapa' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Importar percurso (KML)' })).not.toBeInTheDocument();
  });

  it('rota com percurso mostra o selo e permite remover com confirmação', async () => {
    api.removerPercurso.mockResolvedValue(undefined);
    await abrirMenu(true, rota({ tem_percurso: true, percurso_km: 18.4 }));
    expect(screen.getByText('Percurso')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Remover percurso' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(api.removerPercurso).toHaveBeenCalledWith(7));
  });

  it('o mapa do itinerário desenha o percurso importado', async () => {
    api.percurso.mockResolvedValue({ coordenadas: [[-23.0, -49.0], [-23.1, -49.0], [-23.2, -49.0]], km: 22.24, pontos: 3, importado_em: '2026-11-03T10:00:00-03:00' });
    await abrirMenu(false);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Itinerário e mapa' }));

    const mapa = await screen.findByTestId('mapa-itinerario');
    expect(await within(mapa).findByText('traçado 3 pontos')).toBeInTheDocument();
    expect(api.percurso).toHaveBeenCalledWith(7);
  });
});
