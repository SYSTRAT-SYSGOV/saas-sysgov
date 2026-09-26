import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModalEditarCemiterio } from '../ModalEditarCemiterio';
import { CemiteriosProvider } from '../../CemiteriosContext';
import { cemiteriosApi, type Parque } from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    cemiteriosApi: {
      atualizarParque: vi.fn().mockResolvedValue({}),
      listarParques: vi.fn().mockResolvedValue([]),
    },
  };
});

const mockParque: Parque = {
  id: 1,
  codigo: 'CEM-01',
  nome: 'Cemitério Municipal Central',
  endereco: 'Rua das Flores, 100, Centro',
  responsavel: 'João da Silva',
  tipo: 'municipal',
  situacao: 'ativo',
  lat: -25.4284,
  lng: -49.2733,
  portaria_lat: -25.428,
  portaria_lng: -49.273,
};

describe('ModalEditarCemiterio Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza os campos cadastrais e as seções geodésicas em tamanho expandido', () => {
    render(
      <CemiteriosProvider>
        <ModalEditarCemiterio
          aberto={true}
          onFechar={vi.fn()}
          parque={mockParque}
        />
      </CemiteriosProvider>
    );

    // Título e seções
    expect(screen.getByText(/Editar Necrópole — Cemitério Municipal Central/i)).toBeInTheDocument();
    expect(screen.getByText(/Identificação e Operação/i)).toBeInTheDocument();
    expect(screen.getByText(/Georreferenciamento Geodésico \(GIS\)/i)).toBeInTheDocument();

    // Campos cadastrais
    expect(screen.getByDisplayValue('CEM-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cemitério Municipal Central')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Rua das Flores, 100, Centro')).toBeInTheDocument();
    expect(screen.getByDisplayValue('João da Silva')).toBeInTheDocument();

    // Coordenadas
    expect(screen.getByDisplayValue('-25.4284')).toBeInTheDocument();
    expect(screen.getByDisplayValue('-49.2733')).toBeInTheDocument();
    expect(screen.getByDisplayValue('-25.428')).toBeInTheDocument();
    expect(screen.getByDisplayValue('-49.273')).toBeInTheDocument();

    // Indicador no rodapé
    expect(screen.getByText(/Georreferenciamento central ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/Salvar Alterações/i)).toBeInTheDocument();
  });

  it('permite aplicar colagem rápida de coordenadas no formato lat, lng', async () => {
    render(
      <CemiteriosProvider>
        <ModalEditarCemiterio
          aberto={true}
          onFechar={vi.fn()}
          parque={mockParque}
        />
      </CemiteriosProvider>
    );

    const inputColar = screen.getByPlaceholderText(/Colar par do Google Maps/i);
    fireEvent.change(inputColar, { target: { value: '-25.5000, -49.3000' } });

    const btnAplicar = screen.getAllByRole('button', { name: /Aplicar/i })[0];
    fireEvent.click(btnAplicar);

    expect(screen.getByDisplayValue('-25.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('-49.3')).toBeInTheDocument();
  });

  it('permite copiar coordenadas centrais para a portaria', () => {
    render(
      <CemiteriosProvider>
        <ModalEditarCemiterio
          aberto={true}
          onFechar={vi.fn()}
          parque={{ ...mockParque, portaria_lat: null, portaria_lng: null }}
        />
      </CemiteriosProvider>
    );

    const btnCopiar = screen.getByTitle(/Copiar coordenadas do centro para a portaria/i);
    fireEvent.click(btnCopiar);

    const inputsLat = screen.getAllByDisplayValue('-25.4284');
    expect(inputsLat.length).toBe(2); // Central e Portaria
  });

  it('chama a api para salvar alterações ao submeter o formulário', async () => {
    const onSalvo = vi.fn();
    render(
      <CemiteriosProvider>
        <ModalEditarCemiterio
          aberto={true}
          onFechar={vi.fn()}
          parque={mockParque}
          onSalvo={onSalvo}
        />
      </CemiteriosProvider>
    );

    const btnSalvar = screen.getByRole('button', { name: /Salvar Alterações/i });
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(cemiteriosApi.atualizarParque).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          codigo: 'CEM-01',
          nome: 'Cemitério Municipal Central',
          situacao: 'ativo',
          lat: -25.4284,
          lng: -49.2733,
        })
      );
      expect(onSalvo).toHaveBeenCalled();
    });
  });

  it('suporta tipos legados do banco como "publico" e os envia corretamente', async () => {
    const onSalvo = vi.fn();
    render(
      <CemiteriosProvider>
        <ModalEditarCemiterio
          aberto={true}
          onFechar={vi.fn()}
          parque={{ ...mockParque, tipo: 'publico' }}
          onSalvo={onSalvo}
        />
      </CemiteriosProvider>
    );

    const btnSalvar = screen.getByRole('button', { name: /Salvar Alterações/i });
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(cemiteriosApi.atualizarParque).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          tipo: 'publico',
        })
      );
      expect(onSalvo).toHaveBeenCalled();
    });
  });
});

