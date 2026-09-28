import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModalImportadorJazigos } from '../ModalImportadorJazigos';
import type { Parque, Setor } from '../../api';

const mockParques: Parque[] = [
  {
    id: 1,
    codigo: 'CEM-01',
    nome: 'Cemitério Central',
    endereco: 'Rua Central, 1',
    tipo: 'municipal',
    situacao: 'ativo',
    responsavel: 'Gestor',
    lat: null,
    lng: null,
  },
];

const mockSetores: Setor[] = [
  {
    id: 10,
    park_id: 1,
    codigo: 'Q-01',
    descricao: 'Quadra 1',
    tipo_zona: 'jazigos',
    area_m2: 200,
  },
];

describe('ModalImportadorJazigos Component', () => {
  it('renderiza o modal de importação com botão de download do modelo', () => {
    render(
      <ModalImportadorJazigos
        aberto={true}
        parques={mockParques}
        setores={mockSetores}
        onFechar={vi.fn()}
        onSucesso={vi.fn()}
      />
    );

    expect(screen.getByText(/Importador Assistido de Unidades/i)).toBeInTheDocument();
    expect(screen.getByText(/Cemitério Central/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /baixar planilha modelo/i })).toBeInTheDocument();
    expect(screen.getByText(/Escolher Arquivo CSV/i)).toBeInTheDocument();
  });
});
