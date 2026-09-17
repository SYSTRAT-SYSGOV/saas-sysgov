import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatrizEscalaGrafica, FATORES_CANONICOS } from './MatrizEscalaGrafica';

describe('MatrizEscalaGrafica', () => {
  it('dispara onSelectGrau com o número correto ao clicar nas notas 3 e 4', () => {
    const onSelectGrau = vi.fn();
    render(
      <MatrizEscalaGrafica
        fatores={[FATORES_CANONICOS[0]]}
        respostas={{}}
        onSelectGrau={onSelectGrau}
      />
    );

    // Clica na nota 3
    const cellNota3 = screen.getByText('3');
    fireEvent.click(cellNota3);
    expect(onSelectGrau).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'F1' }),
      3
    );

    // Clica na nota 4
    const cellNota4 = screen.getByText('4');
    fireEvent.click(cellNota4);
    expect(onSelectGrau).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'F1' }),
      4
    );
  });

  it('dispara onSelectGrau com 1, 2 e 5 ao clicar nos graus extremos', () => {
    const onSelectGrau = vi.fn();
    render(
      <MatrizEscalaGrafica
        fatores={[FATORES_CANONICOS[0]]}
        respostas={{}}
        onSelectGrau={onSelectGrau}
      />
    );

    fireEvent.click(screen.getByText('1'));
    expect(onSelectGrau).toHaveBeenCalledWith(expect.anything(), 1);

    fireEvent.click(screen.getByText('2'));
    expect(onSelectGrau).toHaveBeenCalledWith(expect.anything(), 2);

    fireEvent.click(screen.getByText('5'));
    expect(onSelectGrau).toHaveBeenCalledWith(expect.anything(), 5);
  });

  it('não dispara onSelectGrau quando disabled=true (avaliação homologada)', () => {
    const onSelectGrau = vi.fn();
    render(
      <MatrizEscalaGrafica
        fatores={[FATORES_CANONICOS[0]]}
        respostas={{}}
        disabled={true}
        onSelectGrau={onSelectGrau}
      />
    );

    fireEvent.click(screen.getByText('3'));
    expect(onSelectGrau).not.toHaveBeenCalled();
  });
});
