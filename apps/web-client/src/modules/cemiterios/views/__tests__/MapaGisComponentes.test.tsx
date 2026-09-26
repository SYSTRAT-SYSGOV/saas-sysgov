import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ControleCamadasBase, PROVEDORES_PADRAO } from '../ControleCamadasBase';
import { FerramentaMedicao } from '../FerramentaMedicao';
import { FiltrosRapidosMapa } from '../FiltrosRapidosMapa';
import { BotaoExportacaoGis } from '../BotaoExportacaoGis';

describe('Componentes do Mapa GIS', () => {
  describe('ControleCamadasBase', () => {
    it('renderiza os provedores gratuitos e permite alternar a camada ativa', () => {
      const aoMudar = vi.fn();
      render(
        <ControleCamadasBase
          provedores={PROVEDORES_PADRAO}
          provedorAtivoId="esri"
          onMudarProvedor={aoMudar}
        />
      );

      expect(screen.getByText('Satélite Esri')).toBeInTheDocument();
      expect(screen.getByText('OpenStreetMap')).toBeInTheDocument();
      expect(screen.getByText('CartoDB Positron')).toBeInTheDocument();
      expect(screen.getByText('Google Híbrido XYZ')).toBeInTheDocument();

      fireEvent.click(screen.getByText('OpenStreetMap'));
      expect(aoMudar).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'osm', nome: 'OpenStreetMap' })
      );
    });
  });

  describe('FerramentaMedicao', () => {
    it('renderiza botão para ativar quando inativa', () => {
      render(
        <FerramentaMedicao
          ativa={false}
          pontos={[]}
          onAlternar={vi.fn()}
          onLimpar={vi.fn()}
          onDesfazer={vi.fn()}
        />
      );
      expect(screen.getByText('Régua de Medição')).toBeInTheDocument();
    });

    it('quando ativa, exibe cálculos de distância, recuo sanitário e área', () => {
      const pontos: [number, number][] = [
        [-25.4280, -49.2730],
        [-25.4280, -49.2720],
        [-25.4290, -49.2720],
      ];

      render(
        <FerramentaMedicao
          ativa={true}
          pontos={pontos}
          onAlternar={vi.fn()}
          onLimpar={vi.fn()}
          onDesfazer={vi.fn()}
        />
      );

      expect(screen.getByText('Medição Topográfica Ativa')).toBeInTheDocument();
      expect(screen.getByText('Distância Total:')).toBeInTheDocument();
      expect(screen.getByText('Área Fechada:')).toBeInTheDocument();
    });
  });

  describe('FiltrosRapidosMapa', () => {
    it('permite alternar entre os filtros de status e limpar filtro', () => {
      const aoMudar = vi.fn();
      render(
        <FiltrosRapidosMapa
          filtroAtivo="disponivel"
          onFiltroChange={aoMudar}
        />
      );

      expect(screen.getByText('Disponíveis')).toBeInTheDocument();
      expect(screen.getByText('Aptos à Exumação')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Aptos à Exumação'));
      expect(aoMudar).toHaveBeenCalledWith('apto_exumacao');

      fireEvent.click(screen.getByText('Limpar'));
      expect(aoMudar).toHaveBeenCalledWith(null);
    });
  });

  describe('BotaoExportacaoGis', () => {
    it('renderiza botões de exportação GeoJSON e KML', () => {
      render(
        <BotaoExportacaoGis
          parkId={1}
          nomeCemiterio="Cemitério Central"
        />
      );

      expect(screen.getByText('Exportação Cartográfica (QGIS)')).toBeInTheDocument();
      expect(screen.getByText('GeoJSON')).toBeInTheDocument();
      expect(screen.getByText('KML (Earth)')).toBeInTheDocument();
    });
  });
});
