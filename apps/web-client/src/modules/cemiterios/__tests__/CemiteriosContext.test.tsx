import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { CemiteriosNavigationProvider, useCemiteriosNavigation } from '../CemiteriosContext';
import type { Parque } from '../api';

const mockParques: Parque[] = [
  {
    id: 1,
    codigo: 'CEM-01',
    nome: 'Cemitério Municipal Central',
    endereco: 'Rua da Paz, 100 - Centro',
    tipo: 'publico',
    situacao: 'ativo',
    responsavel: 'João Silva',
    lat: -23.55,
    lng: -46.63,
    setores_count: 5,
    jazigos_count: 1200,
  },
  {
    id: 2,
    codigo: 'CEM-02',
    nome: 'Cemitério da Saudade',
    endereco: 'Av. das Flores, 500 - Jardim Esperança',
    tipo: 'publico',
    situacao: 'ativo',
    responsavel: 'Maria Souza',
    lat: -23.58,
    lng: -46.65,
    setores_count: 3,
    jazigos_count: 850,
  },
];

describe('CemiteriosNavigationContext', () => {
  it('gerencia aba ativa e navegação com foco no mapa', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CemiteriosNavigationProvider abaInicial="inventario" cemiteriosIniciais={mockParques}>
        {children}
      </CemiteriosNavigationProvider>
    );

    const { result } = renderHook(() => useCemiteriosNavigation(), { wrapper });

    expect(result.current.abaAtiva).toBe('inventario');
    expect(result.current.focoMapa).toBeNull();

    // Mudar de aba
    act(() => {
      result.current.setAbaAtiva('operacoes');
    });
    expect(result.current.abaAtiva).toBe('operacoes');

    // Navegar diretamente para o mapa com foco em jazigo
    act(() => {
      result.current.navegarParaMapa({
        jazigoId: 10,
        codigo: 'JAZ-010',
        lat: -15.78,
        lng: -47.93,
      });
    });

    expect(result.current.abaAtiva).toBe('mapa');
    expect(result.current.focoMapa).toEqual({
      jazigoId: 10,
      codigo: 'JAZ-010',
      lat: -15.78,
      lng: -47.93,
    });

    // Limpar o foco
    act(() => {
      result.current.limparFocoMapa();
    });
    expect(result.current.focoMapa).toBeNull();
  });

  it('retorna fallback gracioso quando usado sem o Provider', () => {
    const { result } = renderHook(() => useCemiteriosNavigation());
    expect(result.current.abaAtiva).toBe('inventario');
    expect(result.current.focoMapa).toBeNull();
    expect(result.current.modoVisao).toBe('gestao_necropole');
  });

  it('auto-seleciona e vai direto para gestao_necropole quando há necrópole única', () => {
    const parqueUnico = [mockParques[0]];
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CemiteriosNavigationProvider cemiteriosIniciais={parqueUnico}>
        {children}
      </CemiteriosNavigationProvider>
    );

    const { result } = renderHook(() => useCemiteriosNavigation(), { wrapper });

    expect(result.current.cemiteriosDisponiveis).toHaveLength(1);
    expect(result.current.cemiterioAtivoId).toBe(1);
    expect(result.current.cemiterioAtivo?.nome).toBe('Cemitério Municipal Central');
    expect(result.current.modoVisao).toBe('gestao_necropole');
    expect(result.current.temMultiplosCemiterios).toBe(false);
  });

  it('inicia em modo de selecao quando há múltiplos cemitérios', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CemiteriosNavigationProvider cemiteriosIniciais={mockParques}>
        {children}
      </CemiteriosNavigationProvider>
    );

    const { result } = renderHook(() => useCemiteriosNavigation(), { wrapper });

    expect(result.current.cemiteriosDisponiveis).toHaveLength(2);
    expect(result.current.cemiterioAtivoId).toBeNull();
    expect(result.current.modoVisao).toBe('selecao');
    expect(result.current.temMultiplosCemiterios).toBe(true);

    // Selecionar um cemitério
    act(() => {
      result.current.selecionarCemiterio(2);
    });

    expect(result.current.cemiterioAtivoId).toBe(2);
    expect(result.current.cemiterioAtivo?.nome).toBe('Cemitério da Saudade');
    expect(result.current.modoVisao).toBe('gestao_necropole');

    // Voltar para seleção
    act(() => {
      result.current.voltarParaSelecao();
    });

    expect(result.current.cemiterioAtivoId).toBeNull();
    expect(result.current.modoVisao).toBe('selecao');

    // Abrir administração geral
    act(() => {
      result.current.abrirAdministracaoGeral();
    });

    expect(result.current.modoVisao).toBe('administracao_geral');
  });

  it('reconhece perfil de gestor municipal via prop', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CemiteriosNavigationProvider cemiteriosIniciais={mockParques} isGestorMunicipal={true}>
        {children}
      </CemiteriosNavigationProvider>
    );

    const { result } = renderHook(() => useCemiteriosNavigation(), { wrapper });
    expect(result.current.isGestorMunicipal).toBe(true);
  });
});
