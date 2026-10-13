import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react';

export interface QuadroAssinaturaRef {
  limpar: () => void;
  vazio: () => boolean;
  /** PNG em data URI (o formato que a API aceita). */
  imagem: () => string;
}

/**
 * Quadro de assinatura desenhada (mouse, caneta ou dedo). Componente local de uma tela só: o @sysgov/ui não
 * tem primitivo de desenho. Usa pointer events e um canvas com escala do devicePixelRatio.
 */
export const QuadroAssinatura = React.forwardRef<QuadroAssinaturaRef, { altura?: number }>(({ altura = 200 }, ref) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const tracos = useRef(0);

  const ajustar = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const escala = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * escala;
    c.height = altura * escala;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0b1f44';
    tracos.current = 0;
  }, [altura]);

  useEffect(() => {
    ajustar();
  }, [ajustar]);

  useImperativeHandle(ref, () => ({
    limpar: ajustar,
    vazio: () => tracos.current === 0,
    imagem: () => canvas.current?.toDataURL('image/png') ?? '',
  }));

  const ponto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <canvas
      ref={canvas}
      aria-label="Quadro de assinatura"
      className="w-full touch-none rounded-md border border-dashed border-gov-border bg-white"
      style={{ height: altura }}
      onPointerDown={(e) => {
        const ctx = e.currentTarget.getContext('2d');
        if (!ctx) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        desenhando.current = true;
        const { x, y } = ponto(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
      }}
      onPointerMove={(e) => {
        if (!desenhando.current) return;
        const ctx = e.currentTarget.getContext('2d');
        if (!ctx) return;
        const { x, y } = ponto(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        tracos.current++;
      }}
      onPointerUp={() => {
        desenhando.current = false;
      }}
      onPointerLeave={() => {
        desenhando.current = false;
      }}
    />
  );
});
QuadroAssinatura.displayName = 'QuadroAssinatura';
