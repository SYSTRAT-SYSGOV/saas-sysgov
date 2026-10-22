import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from './KpiCard';

describe('KpiCard (padrão do StatCard do CAPD)', () => {
  it('renderiza o mesmo markup do StatCard: barra de cor à esquerda, rótulo, valor colorido e legenda', () => {
    const { container } = render(<KpiCard title="Receita Realizada" value="R$ 10,00" subtitle="35% do total" />);
    const card = container.firstElementChild as HTMLElement;

    expect(card.getAttribute('data-slot')).toBe('card');
    expect(card.className).toContain('border-l-4');
    expect(card.className).toContain('border-l-primary');
    expect(card.className).toContain('shadow-2xs');
    expect(screen.getByText('Receita Realizada').className).toContain('text-xs font-medium text-muted-foreground');
    expect(screen.getByText('R$ 10,00').className).toContain('text-2xl font-bold font-mono tabular-nums text-primary');
    expect(screen.getByText('35% do total')).toBeInTheDocument();
  });

  it('aceita a cor da barra e do valor', () => {
    const { container } = render(
      <KpiCard title="Relatoria" value="0/0" accentClassName="border-l-indigo-500" valueClassName="text-indigo-600 dark:text-indigo-400" />,
    );

    expect((container.firstElementChild as HTMLElement).className).toContain('border-l-indigo-500');
    expect(screen.getByText('0/0').className).toContain('text-indigo-600');
  });

  it('não mostra ícone (o padrão não tem) e mantém a tendência', () => {
    render(<KpiCard title="Total" value={3} icon={<span data-testid="icone" />} trend={{ value: '+5%', isPositive: true, label: 'no mês' }} />);

    expect(screen.queryByTestId('icone')).not.toBeInTheDocument();
    expect(screen.getByText('+5%')).toBeInTheDocument();
  });
});
