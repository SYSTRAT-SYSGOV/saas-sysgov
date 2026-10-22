import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from './KpiCard';

describe('KpiCard (visual do StatCard do CAPD)', () => {
  it('mostra rótulo, valor e legenda, com a barra de destaque à esquerda', () => {
    const { container } = render(<KpiCard title="Receita Realizada" value="R$ 10,00" subtitle="35% do total" />);

    expect(screen.getByText('Receita Realizada')).toBeInTheDocument();
    expect(screen.getByText('R$ 10,00')).toBeInTheDocument();
    expect(screen.getByText('35% do total')).toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain('border-l-4');
  });

  it('mantém ícone e tendência opcionais', () => {
    render(<KpiCard title="Total" value={3} icon={<span data-testid="icone" />} trend={{ value: '+5%', isPositive: true, label: 'no mês' }} />);

    expect(screen.getByTestId('icone')).toBeInTheDocument();
    expect(screen.getByText('+5%')).toBeInTheDocument();
  });
});
