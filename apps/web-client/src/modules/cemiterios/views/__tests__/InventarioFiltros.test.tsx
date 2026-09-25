import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InventarioFiltros, type InventarioFiltrosState } from '../InventarioFiltros';
import type { Parque, Setor } from '../../api';

const mockParques: Parque[] = [
  {
    id: 1,
    codigo: 'CEM-01',
    nome: 'Cemitério da Saudade',
    endereco: 'Rua das Flores, 100',
    tipo: 'municipal',
    situacao: 'ativo',
    responsavel: 'João Silva',
    lat: null,
    lng: null,
  },
  {
    id: 2,
    codigo: 'CEM-02',
    nome: 'Cemitério da Paz',
    endereco: 'Av. Esperança, 500',
    tipo: 'distrital',
    situacao: 'ativo',
    responsavel: 'Maria Souza',
    lat: null,
    lng: null,
  },
];

const mockSetores: Setor[] = [
  {
    id: 10,
    park_id: 1,
    codigo: 'A1',
    descricao: 'Quadra das Acácias',
    tipo_zona: 'jazigos',
    area_m2: 500,
  },
  {
    id: 11,
    park_id: 1,
    codigo: 'B2',
    descricao: 'Gavetas Modulares',
    tipo_zona: 'gavetas',
    area_m2: 300,
  },
];

const estadoInicial: InventarioFiltrosState = {
  parqueId: null,
  setorId: null,
  tipo: null,
  estado: null,
  faixaOcupacao: 'todas',
  busca: '',
};

describe('InventarioFiltros Component', () => {
  it('renderiza os campos de filtro avançado e o contador de registros', () => {
    render(
      <InventarioFiltros
        filtros={estadoInicial}
        onFiltrosChange={vi.fn()}
        onLimparFiltros={vi.fn()}
        parques={mockParques}
        setoresDisponiveis={mockSetores}
        totalRegistros={50}
        totalFiltrados={42}
      />
    );

    expect(screen.getByText(/Filtros Avançados de Inventário/i)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: JAZ-042.../i)).toBeInTheDocument();
  });

  it('ao digitar no campo de busca, aciona onFiltrosChange com o novo texto', () => {
    const onFiltrosChange = vi.fn();
    render(
      <InventarioFiltros
        filtros={estadoInicial}
        onFiltrosChange={onFiltrosChange}
        onLimparFiltros={vi.fn()}
        parques={mockParques}
        setoresDisponiveis={mockSetores}
        totalRegistros={50}
        totalFiltrados={42}
      />
    );

    const inputBusca = screen.getByPlaceholderText(/Ex: JAZ-042.../i);
    fireEvent.change(inputBusca, { target: { value: 'JAZ-01' } });

    expect(onFiltrosChange).toHaveBeenCalledWith({ busca: 'JAZ-01' });
  });

  it('exibe badge de filtros ativos e aciona onLimparFiltros ao clicar em Limpar', () => {
    const onLimparFiltros = vi.fn();
    render(
      <InventarioFiltros
        filtros={{ ...estadoInicial, busca: 'JAZ-99' }}
        onFiltrosChange={vi.fn()}
        onLimparFiltros={onLimparFiltros}
        parques={mockParques}
        setoresDisponiveis={mockSetores}
        totalRegistros={50}
        totalFiltrados={1}
      />
    );

    expect(screen.getByText('Filtros Ativos')).toBeInTheDocument();
    const btnLimpar = screen.getByRole('button', { name: /Limpar/i });
    expect(btnLimpar).toBeInTheDocument();

    fireEvent.click(btnLimpar);
    expect(onLimparFiltros).toHaveBeenCalledTimes(1);
  });

  it('renderiza o campo de filtro de alerta regulatório', () => {
    render(
      <InventarioFiltros
        filtros={estadoInicial}
        onFiltrosChange={vi.fn()}
        onLimparFiltros={vi.fn()}
        parques={mockParques}
        setoresDisponiveis={mockSetores}
        totalRegistros={50}
        totalFiltrados={42}
      />
    );

    expect(screen.getByText(/Alerta Regulatório/i)).toBeInTheDocument();
  });
});
