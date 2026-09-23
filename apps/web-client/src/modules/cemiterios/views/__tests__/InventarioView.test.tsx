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
  });

  it('renderiza os painéis de KPIs, filtros avançados e botões de gestão', async () => {
    render(<InventarioView />);

    // Verifica KPIs
    expect(await screen.findByText('Total de Unidades')).toBeInTheDocument();
    expect(screen.getByText('Disponíveis')).toBeInTheDocument();
    expect(screen.getByText('Concedidas')).toBeInTheDocument();
    expect(screen.getByText('Em Uso / Ocupadas')).toBeInTheDocument();

    // Verifica Botões de Ação
    expect(screen.getByText('Novo Cemitério')).toBeInTheDocument();
    expect(screen.getByText('Novo Setor/Quadra')).toBeInTheDocument();
    expect(screen.getByText('Novo Jazigo')).toBeInTheDocument();

    // Verifica Tabela
    expect(await screen.findByText('JAZ-001')).toBeInTheDocument();
    expect(screen.getByText('Cemitério Municipal')).toBeInTheDocument();
    expect(screen.getByText('Q-01')).toBeInTheDocument();
  });
});
