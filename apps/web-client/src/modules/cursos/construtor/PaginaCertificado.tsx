import React, { useEffect, useRef, useState } from 'react';
import { QrCode } from 'lucide-react';
import type { AssinaturaOrgao, ElementoAssinatura, ElementoLeiaute, OrientacaoCertificado } from '@sysgov/sdk';
import { ALINHAMENTO_CSS, PAGINAS, limitar, mover, redimensionar, rotuloElemento, textoExemplo, type TextosDoModelo } from './leiaute';

interface PaginaProps {
  orientacao: OrientacaoCertificado;
  elementos: ElementoLeiaute[];
  /** Recebe a lista nova a cada arraste, ajuste por teclado ou remoção. */
  onElementos: (mudar: (lista: ElementoLeiaute[]) => ElementoLeiaute[]) => void;
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
  fundoUrl: string | null;
  textos: TextosDoModelo;
  assinaturas: Map<number, AssinaturaOrgao>;
  logotipoUrl?: string | null;
  /** Mensagem no topo da página quando não há fundo. */
  semFundo: string;
  /** Elementos que o Delete não remove (fixos do leiaute). */
  podeRemover?: (el: ElementoLeiaute) => boolean;
  /** Desconta da altura da janela o que fica acima/abaixo da página (cabeçalho, botões). */
  reservaVertical?: number;
}

type Arraste = { id: string; modo: 'mover' | 'largura'; inicioX: number; inicioY: number; original: ElementoLeiaute };

/**
 * Página A4 do certificado em escala, com o fundo e os elementos posicionados por arrastar
 * (alça à direita muda a largura; setas ajustam 1 pt, Shift 10 pt; Delete remove). Coordenadas em
 * pontos — as mesmas do PDF gerado pelo servidor. Usada pelo construtor de modelos e pelo
 * construtor por curso.
 */
export const PaginaCertificado: React.FC<PaginaProps> = ({
  orientacao, elementos, onElementos, selecionado, onSelecionar, fundoUrl, textos, assinaturas, logotipoUrl, semFundo, podeRemover = () => true, reservaVertical = 240,
}) => {
  const [escala, setEscala] = useState(1);
  const area = useRef<HTMLDivElement>(null);
  const arraste = useRef<Arraste | null>(null);
  const [largura, altura] = PAGINAS[orientacao];
  const atual = elementos.find((e) => e.id === selecionado) ?? null;

  // Cabe na largura disponível e na altura da janela: a página inteira fica visível.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const medir = () => setEscala(Math.max(0.3, Math.min(el.clientWidth / largura, (window.innerHeight - reservaVertical) / altura)));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    window.addEventListener('resize', medir);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [largura, altura, reservaVertical]);

  const iniciarArraste = (ev: React.PointerEvent, el: ElementoLeiaute, modo: Arraste['modo']) => {
    ev.preventDefault();
    ev.stopPropagation();
    (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
    onSelecionar(el.id);
    arraste.current = { id: el.id, modo, inicioX: ev.clientX, inicioY: ev.clientY, original: el };
  };

  const moverArraste = (ev: React.PointerEvent) => {
    const a = arraste.current;
    if (!a) return;
    const dx = ev.clientX - a.inicioX;
    const dy = ev.clientY - a.inicioY;
    onElementos((lista) => lista.map((e) => (e.id !== a.id ? e
      : a.modo === 'mover' ? mover(a.original, dx, dy, escala, orientacao) : redimensionar(a.original, dx, escala, orientacao))));
  };

  const soltar = () => {
    arraste.current = null;
  };

  const teclado = (ev: React.KeyboardEvent) => {
    if (!atual) return;
    const passo = ev.shiftKey ? 10 : 1;
    const deslocamentos: Record<string, [number, number]> = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] };
    if (deslocamentos[ev.key]) {
      ev.preventDefault();
      const [dx, dy] = deslocamentos[ev.key];
      onElementos((lista) => lista.map((e) => (e.id === atual.id ? limitar({ ...e, x: e.x + dx, y: e.y + dy }, orientacao) : e)));
    } else if (ev.key === 'Delete' && podeRemover(atual)) {
      ev.preventDefault();
      onElementos((lista) => lista.filter((e) => e.id !== atual.id));
      onSelecionar(null);
    }
  };

  const desenhar = (el: ElementoLeiaute) => {
    const estilo: React.CSSProperties = { left: el.x * escala, top: el.y * escala, width: el.largura * escala };
    const escolhido = el.id === selecionado;
    let conteudo: React.ReactNode;

    if (el.tipo === 'texto') {
      conteudo = (
        <div style={{
          fontFamily: el.fonte === 'serif' ? "'DejaVu Serif', Georgia, serif" : "'DejaVu Sans', Arial, sans-serif",
          fontSize: el.tamanho * escala, color: el.cor, fontWeight: el.negrito ? 700 : 400,
          textAlign: ALINHAMENTO_CSS[el.alinhamento], lineHeight: 1.25, whiteSpace: 'pre-wrap',
        }}>
          {textoExemplo(el, textos) || <span className="opacity-50">(texto vazio)</span>}
        </div>
      );
    } else if (el.tipo === 'qrcode') {
      conteudo = (
        <div className="flex items-center justify-center bg-white text-slate-700" style={{ width: el.largura * escala, height: el.largura * escala, border: '1px solid #94a3b8' }}>
          <QrCode style={{ width: el.largura * escala * 0.7, height: el.largura * escala * 0.7 }} />
        </div>
      );
    } else if (el.tipo === 'logotipo') {
      conteudo = logotipoUrl
        ? <img src={logotipoUrl} alt="Logotipo" className="w-full" draggable={false} />
        : <div className="border border-dashed border-slate-400 bg-white/70 p-1 text-center text-[10px] text-slate-500">Logotipo (envie no cadastro do modelo)</div>;
    } else {
      const assinatura = assinaturas.get(el.assinatura_id);
      const imagem = el.tipo === 'selo' ? assinatura?.selo_url : assinatura?.imagem_url;
      conteudo = (
        <div className="text-center" style={el.tipo === 'assinatura' ? { fontSize: el.tamanho * escala, color: el.cor } : undefined}>
          {imagem
            ? <img src={imagem} alt="" className="w-full" draggable={false} />
            : <div className="border border-dashed border-slate-400 bg-white/70 p-1 text-[10px] text-slate-500">{el.tipo === 'selo' ? 'Selo' : 'Imagem da assinatura'}</div>}
          {el.tipo === 'assinatura' && (el as ElementoAssinatura).mostrar_textos && assinatura && (
            <>
              <div style={{ fontWeight: 700 }}>{assinatura.nome}</div>
              <div>{[assinatura.cargo, assinatura.registro_profissional].filter(Boolean).join(' — ')}</div>
            </>
          )}
        </div>
      );
    }

    return (
      <div
        key={el.id}
        role="button"
        aria-label={`Elemento ${rotuloElemento(el, assinaturas)}`}
        className={`absolute cursor-move select-none ${escolhido ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-primary/60'}`}
        style={estilo}
        onPointerDown={(ev) => iniciarArraste(ev, el, 'mover')}
        onPointerMove={moverArraste}
        onPointerUp={soltar}
      >
        {conteudo}
        {escolhido && (
          <span
            aria-label="Redimensionar"
            className="absolute -right-1.5 top-1/2 h-4 w-3 -translate-y-1/2 cursor-ew-resize rounded-sm bg-primary"
            onPointerDown={(ev) => iniciarArraste(ev, el, 'largura')}
            onPointerMove={moverArraste}
            onPointerUp={soltar}
          />
        )}
      </div>
    );
  };

  return (
    <div ref={area} className="min-w-0">
      <div
        tabIndex={0}
        onKeyDown={teclado}
        onPointerDown={() => onSelecionar(null)}
        className="relative overflow-hidden border border-border bg-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          width: largura * escala, height: altura * escala,
          backgroundImage: fundoUrl ? `url("${fundoUrl}")` : undefined, backgroundSize: '100% 100%',
        }}
        aria-label="Página do certificado"
      >
        {!fundoUrl && <p className="absolute inset-x-0 top-2 text-center text-xs text-slate-400">{semFundo}</p>}
        {elementos.map(desenhar)}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Arraste para mover; a alça à direita muda a largura. Setas ajustam 1 pt (Shift: 10 pt) e Delete remove. Página {largura} × {altura} pt.
      </p>
    </div>
  );
};

export default PaginaCertificado;
