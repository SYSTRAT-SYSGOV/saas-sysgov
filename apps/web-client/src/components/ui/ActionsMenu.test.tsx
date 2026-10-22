import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionsMenu } from '@sysgov/ui';

describe('ActionsMenu', () => {
  it('com uma ação só mostra o botão direto, sem dropdown', () => {
    const onSelect = vi.fn();
    render(<ActionsMenu items={[{ key: 'editar', label: 'Editar', onSelect }]} />);

    fireEvent.click(screen.getByRole('button', { name: /Editar/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('com mais de uma ação mostra só o gatilho do menu', () => {
    render(
      <ActionsMenu
        triggerLabel="Ações da linha"
        items={[
          { key: 'a', label: 'Editar', onSelect: vi.fn() },
          { key: 'b', label: 'Excluir', onSelect: vi.fn() },
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Ações da linha' })).toBeInTheDocument();
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('não impede o clique da linha de disparar a ação única sem propagar', () => {
    const aoClicarLinha = vi.fn();
    const onSelect = vi.fn();
    render(
      <div onClick={aoClicarLinha}>
        <ActionsMenu items={[{ key: 'ver', label: 'Ver', onSelect }]} />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Ver/i }));
    expect(onSelect).toHaveBeenCalled();
    expect(aoClicarLinha).not.toHaveBeenCalled();
  });

  it('sem ações não renderiza nada', () => {
    const { container } = render(<ActionsMenu items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
