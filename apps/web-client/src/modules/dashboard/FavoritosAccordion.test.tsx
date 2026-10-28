import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FavoritosAccordion, FAVORITOS_RECOLHIDO_KEY } from './FavoritosAccordion';

describe('FavoritosAccordion', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('abre aberto, com o total no título', () => {
    render(<FavoritosAccordion total={2}><p>conteúdo</p></FavoritosAccordion>);
    expect(screen.getByRole('button', { name: /Favoritos/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('(2 atalho(s))')).toBeInTheDocument();
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('recolhe, reabre e lembra o estado recolhido entre visitas', () => {
    const { unmount } = render(<FavoritosAccordion total={1}><p>conteúdo</p></FavoritosAccordion>);
    fireEvent.click(screen.getByRole('button', { name: /Favoritos/ }));

    expect(screen.getByRole('button', { name: /Favoritos/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument();
    expect(localStorage.getItem(FAVORITOS_RECOLHIDO_KEY)).toBe('1');

    unmount();
    render(<FavoritosAccordion total={1}><p>conteúdo</p></FavoritosAccordion>);
    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Favoritos/ }));
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
    expect(localStorage.getItem(FAVORITOS_RECOLHIDO_KEY)).toBe('0');
  });
});
