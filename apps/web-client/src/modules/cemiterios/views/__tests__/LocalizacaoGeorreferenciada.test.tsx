import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LocalizacaoGeorreferenciada } from '../LocalizacaoGeorreferenciada';
import { CemiteriosNavigationProvider } from '../../CemiteriosContext';

describe('LocalizacaoGeorreferenciada Component', () => {
  it('renderiza dados georreferenciados com coordenadas formatadas', () => {
    const jazigo = {
      id: 1,
      codigo: 'JAZ-001',
      lat: -15.780123,
      lng: -47.930456,
      comprimento_m: 2.5,
      largura_m: 1.2,
    };

    render(
      <CemiteriosNavigationProvider>
        <LocalizacaoGeorreferenciada jazigo={jazigo} />
      </CemiteriosNavigationProvider>
    );

    expect(screen.getByText(/Georreferenciamento & Mapa GIS/i)).toBeInTheDocument();
    expect(screen.getByText('Georreferenciado')).toBeInTheDocument();
    expect(screen.getByText('-15.780123')).toBeInTheDocument();
    expect(screen.getByText('-47.930456')).toBeInTheDocument();
  });

  it('renderiza aviso de mapeamento pendente quando sem coordenadas', () => {
    const jazigo = {
      id: 2,
      codigo: 'JAZ-002',
      lat: null,
      lng: null,
      comprimento_m: 2.5,
      largura_m: 1.2,
    };

    render(
      <CemiteriosNavigationProvider>
        <LocalizacaoGeorreferenciada jazigo={jazigo} />
      </CemiteriosNavigationProvider>
    );

    expect(screen.getByText('Mapeamento Pendente')).toBeInTheDocument();
    expect(screen.getByText(/ainda não possui coordenadas georreferenciadas/i)).toBeInTheDocument();
  });

  it('aciona navegação para o mapa ao clicar em Ver no Mapa GIS', () => {
    const jazigo = {
      id: 1,
      codigo: 'JAZ-001',
      lat: -15.78,
      lng: -47.93,
      comprimento_m: 2.5,
      largura_m: 1.2,
    };
    const onFecharDrawer = vi.fn();

    render(
      <CemiteriosNavigationProvider>
        <LocalizacaoGeorreferenciada jazigo={jazigo} onFecharDrawer={onFecharDrawer} />
      </CemiteriosNavigationProvider>
    );

    const btnMapa = screen.getByRole('button', { name: /Ver no Mapa GIS/i });
    fireEvent.click(btnMapa);

    expect(onFecharDrawer).toHaveBeenCalled();
  });
});
