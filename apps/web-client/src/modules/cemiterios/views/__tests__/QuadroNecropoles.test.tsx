import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdministracaoGeralView } from '../AdministracaoGeralView';
import { CemiteriosNavigationProvider } from '../../CemiteriosContext';
import type { Parque } from '../../api';

const parque = (id: number, nome: string, extra: Partial<Parque> = {}): Parque => ({
  id, codigo: `CEM-0${id}`, nome, endereco: null, tipo: 'publico', situacao: 'ativo', responsavel: null, lat: null, lng: null, setores_count: 2, jazigos_count: 100, ...extra,
});

describe('Quadro Geral de Necrópoles (DataTable padrão)', () => {
  function abrir(parques: Parque[]) {
    render(
      <CemiteriosNavigationProvider cemiteriosIniciais={parques} isGestorMunicipal modoVisaoInicial="administracao_geral">
        <AdministracaoGeralView />
      </CemiteriosNavigationProvider>,
    );
  }

  it('mostra a ocupação real de cada cemitério e traço quando não há capacidade', () => {
    abrir([parque(1, 'Cemitério Central', { capacidade_total: 200, ocupacao_total: 50 }), parque(2, 'Cemitério Novo')]);
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('Cemitério Novo')).toBeInTheDocument();
    expect(screen.getByText('Ocupação')).toBeInTheDocument();
  });

  it('a grade exporta e a ação "Acessar Gestão" fica na coluna de ações', () => {
    abrir([parque(1, 'Cemitério Central')]);
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acessar Gestão' })).toBeInTheDocument();
  });
});
