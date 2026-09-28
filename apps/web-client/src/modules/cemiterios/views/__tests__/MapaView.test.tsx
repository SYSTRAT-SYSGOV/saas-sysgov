import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MapaView } from '../MapaView';
import { CemiteriosProvider } from '../../CemiteriosContext';
import { cemiteriosApi, type Parque, type MapaBase, type FeatureCollection, type ViasFeatureCollection, type AmenidadesFeatureCollection } from '../../api';

vi.mock('@/core/rbac/useCan', () => ({
  useCan: () => ({ can: () => true, cannot: () => false }),
}));

const mockParques: Parque[] = [
  {
    id: 1,
    codigo: 'CEM-01',
    nome: 'Cemitério Municipal Jardim Independência',
    endereco: 'Rua Principal, 100',
    tipo: 'municipal',
    situacao: 'ativo',
    responsavel: 'Gestor',
    lat: -25.43,
    lng: -49.27,
  },
];

const mapaBaseMock: MapaBase = {
  provedor: 'esri',
  url: 'https://server.arcgisonline.com/tile/{z}/{y}/{x}',
  atribuicao: 'Esri',
  max_zoom: 19,
  catalogo: [{ id: 'esri', nome: 'Satélite Esri', tipo: 'satelite', url: 'https://x/{z}/{y}/{x}', atribuicao: 'Esri', max_zoom: 19 }],
};

const vaziaFc: FeatureCollection = { type: 'FeatureCollection', features: [] };
const viasVaziasFc: ViasFeatureCollection = { type: 'FeatureCollection', features: [] };
const amenidadesVaziasFc: AmenidadesFeatureCollection = { type: 'FeatureCollection', features: [] };

function montar() {
  return render(
    <CemiteriosProvider cemiteriosIniciais={mockParques} cemiterioAtivoIdInicial={1} modoVisaoInicial="gestao_necropole">
      <MapaView />
    </CemiteriosProvider>
  );
}

describe('MapaView Component', () => {
  beforeEach(() => {
    vi.spyOn(cemiteriosApi, 'mapaBase').mockResolvedValue(mapaBaseMock);
    vi.spyOn(cemiteriosApi, 'parques').mockResolvedValue(mockParques);
    vi.spyOn(cemiteriosApi, 'camada').mockResolvedValue(vaziaFc);
    vi.spyOn(cemiteriosApi, 'camadaVias').mockResolvedValue(viasVaziasFc);
    vi.spyOn(cemiteriosApi, 'camadaAmenidades').mockResolvedValue(amenidadesVaziasFc);
    vi.spyOn(cemiteriosApi, 'buscar').mockResolvedValue([]);
  });

  it('renderiza o mapa com o controle de modo de apresentação e a busca', async () => {
    montar();

    expect(await screen.findByRole('group', { name: /modo de apresentação do mapa/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/falecido, jazigo, concessão ou cpf/i)).toBeInTheDocument();
    await waitFor(() => expect(cemiteriosApi.mapaBase).toHaveBeenCalled());
  });

  it('alterna para o modo humanizado ao clicar em "Planta Humanizada"', async () => {
    montar();

    const botaoHumanizado = await screen.findByRole('button', { name: /planta humanizada/i });
    fireEvent.click(botaoHumanizado);

    expect(botaoHumanizado.className).toContain('bg-primary');
  });

  it('busca automaticamente após digitar (debounce), sem precisar de botão "Buscar"', async () => {
    montar();

    const campoBusca = screen.getByPlaceholderText(/falecido, jazigo, concessão ou cpf/i);
    fireEvent.change(campoBusca, { target: { value: 'joao' } });

    await waitFor(() => expect(cemiteriosApi.buscar).toHaveBeenCalledWith('joao'), { timeout: 2000 });
    expect(screen.queryByRole('button', { name: /^buscar$/i })).not.toBeInTheDocument();
  });

  it('carrega as camadas de vias e equipamentos da necrópole ativa', async () => {
    montar();

    await waitFor(() => {
      expect(cemiteriosApi.camadaVias).toHaveBeenCalledWith(1, expect.anything());
      expect(cemiteriosApi.camadaAmenidades).toHaveBeenCalledWith(1, expect.anything());
    });
  });
});
