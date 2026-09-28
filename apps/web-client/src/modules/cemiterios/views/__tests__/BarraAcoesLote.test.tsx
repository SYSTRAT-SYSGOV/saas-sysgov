import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BarraAcoesLote } from '../BarraAcoesLote';

describe('BarraAcoesLote Component', () => {
  it('não renderiza nada se totalSelecionados for 0', () => {
    const { container } = render(
      <BarraAcoesLote
        totalSelecionados={0}
        onLimparSelecao={vi.fn()}
        onInterditarLote={vi.fn()}
        onImprimirLoteQr={vi.fn()}
        onExportarSelecionados={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza a barra com a quantidade correta de selecionados e dispara eventos', () => {
    const onLimpar = vi.fn();
    const onInterditar = vi.fn();
    const onImprimirQr = vi.fn();
    const onExportar = vi.fn();

    render(
      <BarraAcoesLote
        totalSelecionados={5}
        onLimparSelecao={onLimpar}
        onInterditarLote={onInterditar}
        onImprimirLoteQr={onImprimirQr}
        onExportarSelecionados={onExportar}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/unidade\(s\) selecionada\(s\)/i)).toBeInTheDocument();

    // Botão interditar
    const btnInterditar = screen.getByRole('button', { name: /interditar \/ manutenção/i });
    fireEvent.click(btnInterditar);
    expect(onInterditar).toHaveBeenCalledTimes(1);

    // Botão QR lote
    const btnQr = screen.getByRole('button', { name: /plaquetas qr em lote/i });
    fireEvent.click(btnQr);
    expect(onImprimirQr).toHaveBeenCalledTimes(1);

    // Botão exportar
    const btnExportar = screen.getByRole('button', { name: /exportar seleção/i });
    fireEvent.click(btnExportar);
    expect(onExportar).toHaveBeenCalledTimes(1);

    // Botão limpar
    const btnLimpar = screen.getByTitle(/desmarcar todas/i);
    fireEvent.click(btnLimpar);
    expect(onLimpar).toHaveBeenCalledTimes(1);
  });
});
