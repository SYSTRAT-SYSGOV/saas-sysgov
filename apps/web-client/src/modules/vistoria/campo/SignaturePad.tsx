import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';

export interface PontoTraco {
  x: number;
  y: number;
}

export interface AssinaturaCapturada {
  tracadoVetorial: PontoTraco[][];
  imagemBase64: string;
}

export interface SignaturePadHandle {
  limpar: () => void;
  estaVazio: () => boolean;
  exportar: () => AssinaturaCapturada | null;
}

export interface SignaturePadProps {
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Captura de assinatura/rubrica manuscrita touch, reutilizável entre autuado,
 * responsável pelo estabelecimento e testemunha. Usa Pointer Events (unifica
 * touch, caneta e mouse num único handler) e exporta tanto o traçado vetorial
 * (pontos por traço) quanto a imagem rasterizada (PNG base64).
 */
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({ width = 600, height = 200, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const desenhandoRef = useRef(false);
    const tracosRef = useRef<PontoTraco[][]>([]);
    const [vazio, setVazio] = useState(true);

    function obterContexto(): CanvasRenderingContext2D | null {
      return canvasRef.current?.getContext('2d') ?? null;
    }

    function posicaoRelativa(event: React.PointerEvent<HTMLCanvasElement>): PontoTraco {
      const rect = event.currentTarget.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
      event.currentTarget.setPointerCapture(event.pointerId);
      desenhandoRef.current = true;
      const ponto = posicaoRelativa(event);
      tracosRef.current.push([ponto]);

      const contexto = obterContexto();
      if (contexto) {
        contexto.beginPath();
        contexto.moveTo(ponto.x, ponto.y);
      }
    }

    function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
      if (!desenhandoRef.current) return;

      const ponto = posicaoRelativa(event);
      const tracoAtual = tracosRef.current[tracosRef.current.length - 1];
      tracoAtual.push(ponto);

      const contexto = obterContexto();
      if (contexto) {
        contexto.lineWidth = 2;
        contexto.lineCap = 'round';
        contexto.strokeStyle = '#1B1B1B';
        contexto.lineTo(ponto.x, ponto.y);
        contexto.stroke();
      }

      setVazio(false);
    }

    function handlePointerUp() {
      desenhandoRef.current = false;
    }

    function limpar() {
      const contexto = obterContexto();
      if (contexto && canvasRef.current) {
        contexto.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      tracosRef.current = [];
      setVazio(true);
    }

    function estaVazio() {
      return tracosRef.current.length === 0;
    }

    function exportar(): AssinaturaCapturada | null {
      if (estaVazio() || !canvasRef.current) {
        return null;
      }

      return {
        tracadoVetorial: tracosRef.current,
        imagemBase64: canvasRef.current.toDataURL('image/png'),
      };
    }

    useImperativeHandle(ref, () => ({ limpar, estaVazio, exportar }));

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        role="img"
        aria-label={vazio ? 'Área de assinatura vazia' : 'Assinatura capturada'}
        className={className ?? 'touch-none rounded-md border border-input bg-white'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    );
  },
);

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
