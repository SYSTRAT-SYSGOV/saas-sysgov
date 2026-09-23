import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InventarioKpis, calcularMetricasInventario } from '../InventarioKpis';
import type { Jazigo } from '../../api';

const mockJazigos: Jazigo[] = [
  {
    id: 1,
    park_id: 1,
    sector_id: 10,
    codigo: 'JAZ-001',
    tipo: 'jazigo',
    capacidade: 3,
    ocupacao: 0,
    estado: 'disponivel',
    comprimento_m: 2.2,
    largura_m: 1.0,
    lat: null,
    lng: null,
    lock_version: 1,
  },
  {
    id: 2,
    park_id: 1,
    sector_id: 10,
    codigo: 'JAZ-002',
    tipo: 'jazigo',
    capacidade: 3,
    ocupacao: 1,
    estado: 'concedido',
    comprimento_m: 2.2,
    largura_m: 1.0,
    lat: null,
    lng: null,
    lock_version: 1,
  },
  {
    id: 3,
    park_id: 1,
    sector_id: 11,
    codigo: 'JAZ-003',
    tipo: 'gaveta',
    capacidade: 2,
    ocupacao: 1,
    estado: 'ocupado',
    comprimento_m: 2.0,
    largura_m: 0.8,
    lat: null,
    lng: null,
    lock_version: 1,
  },
  {
    id: 4,
    park_id: 2,
    sector_id: 20,
    codigo: 'JAZ-004',
    tipo: 'jazigo',
    capacidade: 3,
    ocupacao: 3,
    estado: 'capacidade_maxima',
    comprimento_m: 2.2,
    largura_m: 1.0,
    lat: null,
    lng: null,
    lock_version: 1,
  },
  {
    id: 5,
    park_id: 2,
    sector_id: 20,
    codigo: 'JAZ-005',
    tipo: 'cova_publica',
    capacidade: 1,
    ocupacao: 0,
    estado: 'manutencao',
    comprimento_m: 2.0,
    largura_m: 0.8,
    lat: null,
    lng: null,
    lock_version: 1,
  },
];

describe('calcularMetricasInventario', () => {
  it('agrega e calcula corretamente totais e percentuais', () => {
    const res = calcularMetricasInventario(mockJazigos);

    expect(res.total).toBe(5);
    expect(res.disponiveis).toBe(1);
    expect(res.concedidos).toBe(1);
    expect(res.ocupados).toBe(1);
    expect(res.capacidadeMaxima).toBe(1);
    expect(res.manutencao).toBe(1);
    expect(res.capacidadeTotal).toBe(12); // 3+3+2+3+1
    expect(res.ocupacaoTotal).toBe(5); // 0+1+1+3+0
    expect(res.taxaOcupacaoPct).toBeCloseTo((5 / 12) * 100, 2);
    expect(res.vagasLivresTotal).toBe(7); // 12 - 5
  });

  it('retorna zeros com lista vazia sem quebrar', () => {
    const res = calcularMetricasInventario([]);
    expect(res.total).toBe(0);
    expect(res.disponiveis).toBe(0);
    expect(res.taxaOcupacaoPct).toBe(0);
    expect(res.vagasLivresTotal).toBe(0);
  });
});

describe('InventarioKpis Component', () => {
  it('renderiza os 6 StatCards com os rótulos e valores corretos', () => {
    render(<InventarioKpis jazigos={mockJazigos} parqueNome="Cemitério Central" />);

    expect(screen.getByText('Total de Unidades')).toBeInTheDocument();
    expect(screen.getByText('Disponíveis')).toBeInTheDocument();
    expect(screen.getByText('Concedidas')).toBeInTheDocument();
    expect(screen.getByText('Em Uso / Ocupadas')).toBeInTheDocument();
    expect(screen.getByText('Capacidade Máxima')).toBeInTheDocument();
    expect(screen.getByText('Em Ruína / Manut.')).toBeInTheDocument();
    expect(screen.getByText('Cemitério Central')).toBeInTheDocument();
  });

  it('exibe skeleton de carregamento quando carregando=true', () => {
    const { container } = render(<InventarioKpis jazigos={[]} carregando />);
    expect(container.querySelectorAll('.animate-pulse').length).toBe(6);
  });
});
