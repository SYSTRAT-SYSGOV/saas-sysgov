import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@sysgov/ui';

export interface AssinaturaDesenhadaRef {
  /** PNG com fundo transparente, recortado no traço; null se nada foi desenhado. */
  gerarPng: () => Promise<Blob | null>;
  limpar: () => void;
}

interface Props {
  ref?: React.Ref<AssinaturaDesenhadaRef>;
  onMudou?: (temDesenho: boolean) => void;
}

const LARGURA = 450;
const ALTURA = 150;
/** Resolução interna maior que a da tela: a assinatura sai nítida no PDF. */
const DENSIDADE = 3;
const MARGEM = 8;

/**
 * Campo para desenhar a assinatura com o mouse, o dedo ou a caneta (como no sistema de
 * referência). O traço é preto sobre fundo transparente, pronto para ir sobre o fundo do
 * certificado.
 */
export const AssinaturaDesenhada: React.FC<Props> = ({ ref, onMudou }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [temDesenho, setTemDesenho] = useState(false);

  const contexto = () => canvas.current?.getContext('2d') ?? null;

  useEffect(() => {
    const ctx = contexto();
    if (!ctx) return;
    // setTransform e não scale: o efeito pode rodar duas vezes (StrictMode) e scale acumularia
    // (9×), deixando o traço grosso, deslocado do ponteiro e cortado na borda.
    ctx.setTransform(DENSIDADE, 0, 0, DENSIDADE, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
  }, []);

  const marcar = (valor: boolean) => {
    setTemDesenho(valor);
    onMudou?.(valor);
  };

  const ponto = (ev: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = ev.currentTarget.getBoundingClientRect();
    return [((ev.clientX - r.left) / r.width) * LARGURA, ((ev.clientY - r.top) / r.height) * ALTURA];
  };

  const iniciar = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = contexto();
    if (!ctx) return;
    ev.preventDefault();
    try {
      ev.currentTarget.setPointerCapture(ev.pointerId);
    } catch {
      // Ponteiro já liberado (ou sintético): o traço segue sem a captura.
    }
    desenhando.current = true;
    const [x, y] = ponto(ev);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Um toque sem arrastar ainda deixa um ponto.
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    if (!temDesenho) marcar(true);
  };

  const mover = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = contexto();
    if (!desenhando.current || !ctx) return;
    const [x, y] = ponto(ev);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const parar = () => {
    desenhando.current = false;
  };

  const limpar = () => {
    const ctx = contexto();
    if (ctx) ctx.clearRect(0, 0, LARGURA, ALTURA);
    marcar(false);
  };

  useImperativeHandle(ref, () => ({
    limpar,
    gerarPng: async () => {
      const origem = canvas.current;
      const ctx = contexto();
      if (!origem || !ctx || !temDesenho) return null;
      // Recorta no retângulo do traço (com uma margem) para a imagem não carregar espaço vazio.
      const { width, height } = origem;
      const pixels = ctx.getImageData(0, 0, width, height).data;
      let [x0, y0, x1, y1] = [width, height, -1, -1];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (pixels[(y * width + x) * 4 + 3] > 0) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      if (x1 < 0) return null;
      const m = MARGEM * DENSIDADE;
      x0 = Math.max(0, x0 - m);
      y0 = Math.max(0, y0 - m);
      x1 = Math.min(width - 1, x1 + m);
      y1 = Math.min(height - 1, y1 + m);
      const recorte = document.createElement('canvas');
      recorte.width = x1 - x0 + 1;
      recorte.height = y1 - y0 + 1;
      recorte.getContext('2d')?.drawImage(origem, x0, y0, recorte.width, recorte.height, 0, 0, recorte.width, recorte.height);
      return new Promise((resolver) => recorte.toBlob((b) => resolver(b), 'image/png'));
    },
  }));

  return (
    <div className="space-y-1">
      <canvas
        ref={canvas}
        width={LARGURA * DENSIDADE}
        height={ALTURA * DENSIDADE}
        aria-label="Área para desenhar a assinatura"
        className="block w-full max-w-[450px] touch-none cursor-crosshair rounded-md border-2 border-dashed border-primary/60 bg-white"
        style={{ aspectRatio: `${LARGURA} / ${ALTURA}` }}
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={parar}
        onPointerLeave={parar}
      />
      <Button type="button" size="sm" variant="outline" onClick={limpar} disabled={!temDesenho}>
        <Eraser className="h-4 w-4" /> Limpar desenho
      </Button>
    </div>
  );
};

export default AssinaturaDesenhada;
