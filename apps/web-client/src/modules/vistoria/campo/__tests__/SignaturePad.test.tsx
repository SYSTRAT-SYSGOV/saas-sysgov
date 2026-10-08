import React, { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { SignaturePad, type SignaturePadHandle } from '../SignaturePad';

/** jsdom não implementa o construtor global PointerEvent. */
class PointerEventPolyfill extends MouseEvent {
  pointerId: number;
  constructor(type: string, params: MouseEventInit & { pointerId: number }) {
    super(type, params);
    this.pointerId = params.pointerId;
  }
}

function dispararPointer(elemento: Element, tipo: string, coords: { clientX: number; clientY: number }) {
  fireEvent(elemento, new PointerEventPolyfill(tipo, { bubbles: true, cancelable: true, pointerId: 1, ...coords }));
}

describe('SignaturePad', () => {
  beforeEach(() => {
    // jsdom não implementa setPointerCapture/getContext('2d') completos.
    Element.prototype.setPointerCapture = vi.fn();
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,FAKE');
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({ left: 0, top: 0, right: 600, bottom: 200, width: 600, height: 200 });
  });

  it('começa vazio', () => {
    const ref = createRef<SignaturePadHandle>();
    render(<SignaturePad ref={ref} />);

    expect(ref.current?.estaVazio()).toBe(true);
    expect(ref.current?.exportar()).toBeNull();
    expect(screen.getByRole('img', { name: /vazia/i })).toBeInTheDocument();
  });

  it('captura o traçado ao desenhar e exporta vetor + PNG', () => {
    const ref = createRef<SignaturePadHandle>();
    render(<SignaturePad ref={ref} />);
    const canvas = screen.getByRole('img');

    dispararPointer(canvas, 'pointerdown', { clientX: 10, clientY: 10 });
    dispararPointer(canvas, 'pointermove', { clientX: 20, clientY: 15 });
    dispararPointer(canvas, 'pointermove', { clientX: 30, clientY: 25 });
    dispararPointer(canvas, 'pointerup', { clientX: 30, clientY: 25 });

    expect(ref.current?.estaVazio()).toBe(false);

    const capturado = ref.current?.exportar();
    expect(capturado).not.toBeNull();
    expect(capturado?.tracadoVetorial).toHaveLength(1);
    expect(capturado?.tracadoVetorial[0]).toEqual([
      { x: 10, y: 10 },
      { x: 20, y: 15 },
      { x: 30, y: 25 },
    ]);
    expect(capturado?.imagemBase64).toBe('data:image/png;base64,FAKE');
  });

  it('limpar() reseta o traçado', () => {
    const ref = createRef<SignaturePadHandle>();
    render(<SignaturePad ref={ref} />);
    const canvas = screen.getByRole('img');

    dispararPointer(canvas, 'pointerdown', { clientX: 10, clientY: 10 });
    dispararPointer(canvas, 'pointerup', { clientX: 10, clientY: 10 });
    expect(ref.current?.estaVazio()).toBe(false);

    ref.current?.limpar();

    expect(ref.current?.estaVazio()).toBe(true);
    expect(ref.current?.exportar()).toBeNull();
  });

  it('não registra movimento antes do pointerdown', () => {
    const ref = createRef<SignaturePadHandle>();
    render(<SignaturePad ref={ref} />);
    const canvas = screen.getByRole('img');

    dispararPointer(canvas, 'pointermove', { clientX: 20, clientY: 15 });

    expect(ref.current?.estaVazio()).toBe(true);
  });
});
